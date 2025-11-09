#!/usr/bin/env python3
"""
从 Markdown 文件构建财新周刊 issue JSON

仅支持从 Markdown 文件提取内容，不处理 OCR JSON
适用于从 PaddleOCR 等工具导出的 Markdown 文件
"""

import argparse
import json
import os
import re
import sys
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from email.utils import formatdate

try:
    import requests
except Exception:
    requests = None


# ========== 工具函数 ==========

def normalize_title(s: str) -> str:
    """标准化标题：去除多余空格、统一竖线符号"""
    s1 = re.sub(r"\s+", " ", s.replace("｜", "|").strip())
    # 处理重复标题：如果标题自身重复，取前半部分
    # 例如："专栏 | 与境外罪犯离婚有多难 专栏 | 与境外罪犯离婚有多难"
    words = s1.split()
    if len(words) % 2 == 0:
        mid = len(words) // 2
        first_half = " ".join(words[:mid])
        second_half = " ".join(words[mid:])
        if first_half == second_half:
            return first_half
    return s1


DISLAIMER_START_PHRASE = "请务必在总结开头增加这段话"
# Match both H1 (#) and H2 (##) headings
MD_H_RE = re.compile(r"^#{1,2}\s+(.+)$", re.MULTILINE)
IMG_RE = re.compile(r"<img[^>]*?src=\"([^\"]+)\"", re.IGNORECASE)
MD_IMG_RE = re.compile(r"!\[[^\]]*\]\(([^\)\s]+)\)")


def extract_disclaimer(text: str) -> Tuple[str, Optional[str]]:
    """提取免责声明并从正文中移除"""
    if DISLAIMER_START_PHRASE not in text:
        return text.strip(), None
    
    lines = text.splitlines()
    start_idx = next((i for i, ln in enumerate(lines) if DISLAIMER_START_PHRASE in ln), None)
    if start_idx is None:
        return text.strip(), None
    
    # 找到空行作为终点（最多往后看8行）
    end_idx = None
    for k in range(start_idx, min(len(lines), start_idx + 8)):
        if not lines[k].strip():
            end_idx = k
            break
    if end_idx is None:
        end_idx = min(len(lines), start_idx + 3)
    
    buf = [ln for ln in lines[start_idx:end_idx] if ln.strip()]
    disclaimer = "\n".join(buf).strip()
    del lines[start_idx:end_idx]
    return "\n".join(lines).strip(), disclaimer


# ========== Markdown 解析 ==========

def parse_markdown_by_outline(
    md_text: str, outline_titles: List[str]
) -> Dict[str, Dict[str, Optional[str]]]:
    """使用 outline 中的标题精确切分 Markdown
    
    返回: {normalized_title: {"content": str, "image": str, "disclaimer": str}}
    """
    all_matches = list(MD_H_RE.finditer(md_text))
    outline_norm = [normalize_title(t) for t in outline_titles]

    def best_match(title: str) -> Optional[str]:
        t = normalize_title(title)
        t_comp = t.replace(" ", "")
        for o in outline_norm:
            if t == o or t_comp == o.replace(" ", ""):
                return o
        return None

    # 收集匹配的标题位置
    matched: List[Tuple[int, str]] = []
    for m in all_matches:
        title = m.group(1)
        o = best_match(title)
        if o:
            matched.append((m.start(), o))

    # 去重并排序
    seen = set()
    matched_sorted = []
    for pos, t in sorted(matched, key=lambda x: x[0]):
        if t in seen:
            continue
        seen.add(t)
        matched_sorted.append((pos, t))

    # 构建切片
    sections: Dict[str, Dict[str, Optional[str]]] = {}
    for i, (start, t) in enumerate(matched_sorted):
        end = matched_sorted[i + 1][0] if i + 1 < len(matched_sorted) else len(md_text)
        body = md_text[start:end]
        # 去掉标题行
        m = MD_H_RE.match(body.splitlines()[0])
        if m:
            body = body[body.find("\n") + 1:]

        img_m = IMG_RE.search(body) or MD_IMG_RE.search(body)
        img_url = img_m.group(1) if img_m else None
        cleaned, disclaimer = extract_disclaimer(body)
        sections[t] = {"content": cleaned, "image": img_url, "disclaimer": disclaimer}

    return sections


def manual_find_section(
    md_text: str, target_title: str, outline_titles: List[str]
) -> Optional[Dict[str, Optional[str]]]:
    """兜底策略：手动查找包含目标标题的段落，切到下一个 outline 标题为止"""
    lines = md_text.splitlines()
    headings: List[Tuple[int, str]] = []
    for idx, ln in enumerate(lines):
        if ln.startswith("## "):
            t = ln[3:].strip()
            headings.append((idx, normalize_title(t)))

    target_n = normalize_title(target_title).replace(" ", "")
    outline_norm = [normalize_title(t).replace(" ", "") for t in outline_titles]

    # 找起点
    start_line = None
    for i, (idx, t) in enumerate(headings):
        if t.replace(" ", "") == target_n or target_n in t.replace(" ", ""):
            start_line = idx
            start_pos = i
            break
    if start_line is None:
        return None

    # 找终点：下一个在 outline 中的标题
    end_line = len(lines)
    for j in range(start_pos + 1, len(headings)):
        _, next_t = headings[j]
        if next_t.replace(" ", "") in outline_norm:
            end_line = headings[j][0]
            break

    body = "\n".join(lines[start_line + 1 : end_line])
    img_m = IMG_RE.search(body) or MD_IMG_RE.search(body)
    img_url = img_m.group(1) if img_m else None
    cleaned, disclaimer = extract_disclaimer(body)
    return {"content": cleaned, "image": img_url, "disclaimer": disclaimer}


# ========== Gemini 调用 ==========

def call_gemini(
    endpoint: str,
    issue_id: str,
    articles: List[Dict[str, Any]],
    api_key: Optional[str] = None,
    prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """调用 Gemini 云函数生成摘要和洞察"""
    if not requests:
        raise RuntimeError("requests module not installed")
    
    headers = {"Content-Type": "application/json"}
    headers["Date"] = formatdate(usegmt=True)
    headers["Origin"] = os.environ.get("CAIXIN_CLIENT_ORIGIN", "http://localhost:5173")
    
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    payload: Dict[str, Any] = {"issueId": issue_id, "articles": articles}
    if prompt:
        payload["prompt"] = prompt
    
    # 增加超时时间到 300 秒（5分钟），避免处理大批量文章时超时
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=300)
    
    try:
        resp.raise_for_status()
    except Exception as e:
        body = resp.text[:2000] if hasattr(resp, "text") else "<no body>"
        raise RuntimeError(f"Gemini endpoint error {resp.status_code}: {body}") from e
    
    return resp.json()


# ========== 主流程 ==========

def main() -> None:
    parser = argparse.ArgumentParser(
        description="从 Markdown 文件构建财新周刊 issue JSON"
    )
    parser.add_argument("--issue-id", required=True, help="期刊 ID，如 2025-40")
    parser.add_argument("--issue-title", default="", help="期刊标题")
    parser.add_argument("--publish-date", default="", help="出版日期 YYYY-MM-DD")
    parser.add_argument("--pdf", required=True, help="PDF 文件路径（仅用于生成 URL）")
    parser.add_argument("--md-files", nargs="+", required=True, help="Markdown 文件路径")
    parser.add_argument("--outline", required=True, help="Outline JSON 文件路径")
    parser.add_argument("--output-dir", required=True, help="输出目录")
    parser.add_argument("--oss-base-url", required=True, help="OSS 基础 URL")
    parser.add_argument("--gemini-endpoint", help="Gemini 云函数端点（可选）")
    parser.add_argument("--gemini-api-key", help="Gemini API Key（可选）")
    parser.add_argument("--prompt-file", help="Prompt 文件路径（可选）")
    args = parser.parse_args()

    # 创建输出目录
    out_dir = Path(args.output_dir)
    data_dir = out_dir / "data"
    issues_dir = data_dir / "issues"
    md_dir = data_dir / "markdown"
    for d in (issues_dir, md_dir):
        d.mkdir(parents=True, exist_ok=True)

    # 读取 outline
    with open(args.outline, "r", encoding="utf-8") as f:
        outline_obj = json.load(f)
    outline = outline_obj.get("outline") or outline_obj
    if not isinstance(outline, list):
        print("❌ Invalid outline JSON format", file=sys.stderr)
        sys.exit(2)

    issue_title = args.issue_title or outline_obj.get("issueTitle") or args.issue_id
    publish_date = args.publish_date or ""
    pdf_url = f"{args.oss_base_url.rstrip('/')}/data/pdfs/{args.issue_id}.pdf"

    # 读取所有 Markdown 文件（保持原始顺序和分组）
    md_file_contents = []
    for md_path in args.md_files:
        md_file_contents.append({
            "path": md_path,
            "content": Path(md_path).read_text(encoding="utf-8")
        })
    
    # 合并所有 MD（用于兜底匹配）
    combined_md = "\n\n".join(f["content"] for f in md_file_contents)
    outline_titles = [art["title"] for art in outline]

    # 解析 Markdown
    print(f"[INFO] 解析 Markdown，共 {len(outline)} 篇文章...")
    sections = parse_markdown_by_outline(combined_md, outline_titles)

    # 构建 issue JSON 和 markdown
    md_parts = []
    articles = []
    # 按 MD 文件分组的 AI 输入（新增）
    ai_inputs_by_file: List[Dict[str, Any]] = []  # [{"md_path": str, "articles": [...]}]

    for idx, art in enumerate(outline):
        title = art["title"]
        title_norm = normalize_title(title)
        page = int(art["pageNumber"])

        # 尝试匹配
        info = sections.get(title_norm)
        if not info:
            print(f"[WARN] 未找到精确匹配: {title}")
            info = manual_find_section(combined_md, title, outline_titles)
            if info:
                print(f"[INFO] 兜底匹配成功: {title}")

        content = info.get("content", "") if info else ""
        image = info.get("image", "") if info else ""
        disclaimer = info.get("disclaimer", "") if info else ""

        # 构建 Markdown 片段
        md = f"## {title}\n"
        if image:
            md += f"![]({image})\n\n"
        md += content + "\n\n---\n\n"
        md_parts.append(md)

        # 构建文章 JSON
        article_obj = {
            "id": f"{args.issue_id}-{idx}",
            "title": title,
            "pageNumber": page,
            "order": idx,
            "coverImage": image,
            "summary": "",
            "insight": "",
            "disclaimer": disclaimer,
        }
        articles.append(article_obj)

        # 如果有内容，找出所属的 MD 文件并加入 AI 处理队列
        if content:
            # 查找该文章属于哪个 MD 文件
            found_in_file = None
            for md_file in md_file_contents:
                # 标准化后检查：移除空格和统一竖线符号
                md_content_norm = md_file["content"].replace(" ", "").replace("｜", "|")
                title_check = title.replace(" ", "").replace("｜", "|")
                if title_check in md_content_norm:
                    found_in_file = md_file["path"]
                    break
            
            # 如果找不到，默认归入第一个文件
            if not found_in_file:
                found_in_file = md_file_contents[0]["path"] if md_file_contents else "unknown"
            
            # 加入对应文件的 AI 输入组
            group = next((g for g in ai_inputs_by_file if g["md_path"] == found_in_file), None)
            if not group:
                group = {"md_path": found_in_file, "articles": []}
                ai_inputs_by_file.append(group)
            
            group["articles"].append({
                "id": article_obj["id"],
                "title": title,
                "content": content,
            })

    # 写入 Markdown
    md_path = md_dir / f"{args.issue_id}.md"
    md_path.write_text("".join(md_parts), encoding="utf-8")
    print(f"[INFO] Markdown 已保存: {md_path}")

    # 调用 Gemini（如果提供了端点）
    if args.gemini_endpoint and ai_inputs_by_file:
        total_articles = sum(len(g["articles"]) for g in ai_inputs_by_file)
        print(f"[INFO] 调用 Gemini，共 {total_articles} 篇文章，分 {len(ai_inputs_by_file)} 个 MD 文件处理...")
        
        # 读取 prompt
        prompt_text = None
        if args.prompt_file:
            try:
                prompt_text = Path(args.prompt_file).read_text(encoding="utf-8")
            except Exception as e:
                print(f"[WARN] 无法读取 prompt 文件: {e}")

        # 按 MD 文件分组调用 Gemini
        for file_idx, group in enumerate(ai_inputs_by_file, start=1):
            md_file_name = Path(group["md_path"]).name
            articles_in_file = group["articles"]
            print(f"\n[INFO] 处理 MD 文件 {file_idx}/{len(ai_inputs_by_file)}: {md_file_name} ({len(articles_in_file)} 篇文章)")
            
            try:
                resp = call_gemini(
                    args.gemini_endpoint,
                    args.issue_id,
                    articles_in_file,
                    args.gemini_api_key,
                    prompt_text,
                )
                
                if "articles" not in resp:
                    print(f"[WARN] Gemini 返回格式异常，缺少 articles 字段")
                    print(f"[DEBUG] 响应: {json.dumps(resp, ensure_ascii=False)[:500]}")
                    continue
                
                # 回填 summary 和 insight
                by_id = {a["id"]: a for a in resp.get("articles", [])}
                for art in articles:
                    obj = by_id.get(art["id"])
                    if obj:
                        art["summary"] = obj.get("summary", "")
                        art["insight"] = obj.get("insight", "")
                
                print(f"[INFO] ✅ {md_file_name}: 成功处理 {len(by_id)} 篇文章")
            except Exception as e:
                print(f"[WARN] ❌ {md_file_name}: 处理失败 - {e}")

    # 写入 issue JSON
    issue_json = {
        "id": args.issue_id,
        "title": issue_title,
        "publishDate": publish_date,
        "pdfUrl": pdf_url,
        "articles": articles,
    }
    issue_path = issues_dir / f"{args.issue_id}.json"
    issue_path.write_text(
        json.dumps(issue_json, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[INFO] Issue JSON 已保存: {issue_path}")

    # 打印上传清单
    print(
        textwrap.dedent(
            f"""
        === 完成 ===
        需上传到 OSS 的文件（/data/ 目录下）:
          - issues/{args.issue_id}.json
          - markdown/{args.issue_id}.md (可选)
          - pdfs/{args.issue_id}.pdf (需手动上传 PDF)
        
        本地文件路径:
          - Issue JSON: {issue_path}
          - Markdown:   {md_path}
          - PDF URL:    {pdf_url}
        """
        )
    )


if __name__ == "__main__":
    main()

