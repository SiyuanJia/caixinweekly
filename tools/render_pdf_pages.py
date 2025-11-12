#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 PDF 预渲染为分页静态图片，并生成 manifest.json。
依赖：PyMuPDF (pymupdf)

用法示例：
  python3 tools/render_pdf_pages.py \
    --pdf "public/data/pdfs/2025-40.pdf" \
    --outline "input/2025-40-outline.json" \
    --out "public/data/pages/2025-40" \
    --width 1024 \
    --quality 75 \
    --format webp
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import fitz  # PyMuPDF  # pyright: ignore[reportMissingImports]
except Exception as exc:
    raise SystemExit(
        "未安装 PyMuPDF。请先执行：python3 -m pip install pymupdf\n"
        f"导入错误：{exc}"
    )
try:
    from PIL import Image  # Pillow（用于导出 JPEG / WEBP）
except Exception:
    Image = None  # 允许缺失，届时退回 PNG


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def render_pdf_to_images(
    pdf_path: Path,
    out_dir: Path,
    width: int = 1024,
    img_format: str = "webp",
    quality: int = 75,
    start_page: int = 1,
    end_page: Optional[int] = None,
) -> Dict[str, Any]:
    """
    渲染 PDF 为图片。返回产物信息：
      {
        "numPages": int,
        "images": ["001.webp", ...],
        "pageHeights": [int, ...],  # 与 width 对应的缩放后高度
      }
    """
    assert img_format in ("webp", "png", "jpeg", "jpg")
    pdf = fitz.open(pdf_path.as_posix())
    num_pages = pdf.page_count
    if end_page is None or end_page > num_pages:
        end_page = num_pages
    if start_page < 1:
        start_page = 1

    images: List[str] = []
    page_heights: List[int] = []

    for page_num in range(start_page, end_page + 1):
        page = pdf.load_page(page_num - 1)
        rect = page.rect
        scale = float(width) / float(rect.width)
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        out_ext = ('jpg' if img_format in ('jpeg', 'jpg') else img_format)
        out_name = f"{page_num:03d}.{out_ext}"
        out_path = out_dir / out_name
        # 保存：优先用 Pillow 以支持 JPEG/WEBP 的 quality；否则退回 PNG。
        if img_format == "png" or Image is None:
            # 直接保存 PNG
            # 若用户指定了 jpeg/webp 但 Pillow 不可用，回退为 PNG
            png_path = out_path
            if img_format != "png":
                png_path = out_dir / f"{page_num:03d}.png"
            pix.save(png_path.as_posix())
            if Image is None and img_format != "png":
                out_name = png_path.name
        else:
            mode = "RGBA" if pix.alpha else "RGB"
            pil_img = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
            if mode == "RGBA":
                pil_img = pil_img.convert("RGB")
            save_format = "WEBP" if img_format == "webp" else "JPEG"
            pil_img.save(out_path.as_posix(), format=save_format, quality=quality, optimize=True)
        images.append(out_name)
        page_heights.append(pix.height)

    pdf.close()
    return {
        "numPages": num_pages,
        "images": images,
        "pageHeights": page_heights,
        "width": width,
        "format": "jpg" if img_format == "jpeg" else img_format,
        "quality": quality,
    }


def load_outline(outline_path: Optional[Path]) -> Dict[str, Any]:
    if not outline_path or not outline_path.exists():
        return {"issueTitle": "", "outline": []}
    with open(outline_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # 仅提取必要字段
    outline = []
    for item in data.get("outline", []):
        outline.append({
            "title": item.get("title", ""),
            "pageNumber": int(item.get("pageNumber", 1)),
            "order": int(item.get("order", 0)),
        })
    return {"issueTitle": data.get("issueTitle", ""), "outline": outline}


def write_manifest(
    out_dir: Path,
    render_info: Dict[str, Any],
    outline_info: Dict[str, Any],
) -> None:
    manifest = {
        "numPages": render_info["numPages"],
        "images": render_info["images"],
        "pageHeights": render_info["pageHeights"],
        "width": render_info["width"],
        "format": render_info["format"],
        "quality": render_info["quality"],
        "issueTitle": outline_info.get("issueTitle", ""),
        "outline": outline_info.get("outline", []),
        # 约定前端以 manifest 所在目录为基准拼接图片
        "base": "./",
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }
    with open(out_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Render PDF to paged images with manifest.")
    parser.add_argument("--pdf", required=True, help="Path to source PDF.")
    parser.add_argument("--outline", required=False, help="Path to outline JSON.")
    parser.add_argument("--out", required=True, help="Output directory.")
    parser.add_argument("--width", type=int, default=1024, help="Target width (px).")
    parser.add_argument("--format", choices=["webp", "png", "jpeg", "jpg"], default="webp")
    parser.add_argument("--quality", type=int, default=75, help="Image quality for lossy formats.")
    parser.add_argument("--start", type=int, default=1, help="Start page (1-based).")
    parser.add_argument("--end", type=int, default=0, help="End page (inclusive). 0 means to last.")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    outline_path = Path(args.outline) if args.outline else None
    out_dir = Path(args.out)
    ensure_dir(out_dir)

    end_page = None if args.end == 0 else args.end
    render_info = render_pdf_to_images(
        pdf_path=pdf_path,
        out_dir=out_dir,
        width=args.width,
        img_format=args.format,
        quality=args.quality,
        start_page=args.start,
        end_page=end_page,
    )
    outline_info = load_outline(outline_path)
    write_manifest(out_dir, render_info, outline_info)
    print(f"完成：共 {render_info['numPages']} 页，输出目录：{out_dir}")


if __name__ == "__main__":
    main()


