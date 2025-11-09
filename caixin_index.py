# index.py
import json
import os
import requests

def handler(event, context):
    # =============== 调试：打印原始 event ===============
    print("=== Raw event type:", type(event), "===")
    print("=== Raw event:", event, "===")
    # =================================================

    # Step 1: 如果 event 是 bytes，先 decode 成 str
    if isinstance(event, bytes):
        try:
            event_str = event.decode('utf-8')
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Failed to decode event bytes: {str(e)}'})
            }
    elif isinstance(event, str):
        event_str = event
    else:
        # 如果已经是 dict，转为字符串再处理（兼容性）
        event_str = json.dumps(event, ensure_ascii=False)

    # Step 2: 将 event_str 解析为 dict
    try:
        event_dict = json.loads(event_str)
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Invalid event JSON: {str(e)}'})
        }

    # ========== 👇 在这里添加新代码：验证请求来源 ==========
    # 获取环境变量中配置的允许来源
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*')

    # 获取请求的 Origin（处理大小写不敏感）
    headers = event_dict.get('headers', {})
    request_origin = headers.get('origin') or headers.get('Origin') or headers.get('ORIGIN') or ''

    print(f"=== Request Origin: {request_origin} ===")
    print(f"=== Allowed Origins: {allowed_origins} ===")

    # 验证来源
    if allowed_origins != '*':
        allowed_list = [origin.strip() for origin in allowed_origins.split(',')]
        
        if request_origin not in allowed_list:
            print(f"=== BLOCKED: Origin {request_origin} not in allowed list ===")
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': request_origin if request_origin else '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Accept'
                },
                'body': json.dumps({'error': 'Origin not allowed'})
            }
        cors_origin = request_origin
    else:
        cors_origin = '*'

    print(f"=== CORS Origin set to: {cors_origin} ===")
    # ========== 👆 新增代码结束 ==========

    # ========== 新增：处理 OPTIONS 预检请求 ==========
    # 获取 HTTP 方法（阿里云函数格式）
    request_context = event_dict.get('requestContext', {})
    http_info = request_context.get('http', {})
    http_method = http_info.get('method', 'POST').upper()
    
    print(f"=== HTTP Method: {http_method} ===")
    
    # 如果是 OPTIONS 请求，直接返回 CORS 头
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': cors_origin,
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Accept',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    # ================================================

    # Step 3: 获取 body 字段（它是一个 JSON 字符串）
    raw_body = event_dict.get('body', '{}')

    # Step 4: 解析 body 为 Python 对象
    if isinstance(raw_body, str):
        try:
            body = json.loads(raw_body)
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Invalid request body JSON: {str(e)}'})
            }
    else:
        body = raw_body  # 理论上不会发生，但兜底

    # Step 5: 调用 302.ai（兼容两种输入：messages 或 issueId/articles/prompt）
    API_KEY = os.environ.get('THIRTY_TWO_AI_API_KEY')
    if not API_KEY:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': cors_origin},
            'body': json.dumps({'error': 'API key not configured in environment variables'})
        }

    API_URL = "https://api.302.ai/v1/chat/completions"

    # 读取可能的两种输入
    issue_id = body.get('issueId')
    articles = body.get('articles') if isinstance(body.get('articles'), list) else None
    prompt_text = body.get('prompt')
    model = body.get('model', 'gemini-2.5-pro')

    if articles:
        # 适配批量摘要/洞察：把 articles 映射为一个 user 消息，让模型严格返回 JSON
        # 保留你提供的 prompt 作为 system 或补默认
        system_content = prompt_text or (
            "你是一名资深财经编辑。基于我提供的每篇 {id,title,content}，为每篇生成 summary(≤200字) 和 insight(≤500字)。"
            "仅输出严格的 JSON: {\"issueId\":\"...\",\"articles\":[{\"id\":\"...\",\"summary\":\"...\",\"insight\":\"...\"}]}，不要解释。"
        )
        user_payload = {
            'issueId': issue_id or 'unknown-issue',
            'articles': [
                {
                    'id': str(a.get('id')),
                    'title': a.get('title', ''),
                    'content': a.get('content', ''),
                }
                for a in articles
            ]
        }
        messages = [
            {'role': 'system', 'content': system_content},
            {'role': 'user', 'content': json.dumps(user_payload, ensure_ascii=False)}
        ]
    else:
        # 兼容旧接口：直接透传 messages
        messages = body.get('messages', [])

    payload = {"model": model, "messages": messages}
    req_headers = {
        'Accept': 'application/json',
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        print(f"=== Calling 302.ai API ===")
        print(f"Model: {model}")
        print(f"Messages count: {len(messages)}")

        response = requests.post(API_URL, headers=req_headers, json=payload, timeout=120)

        print(f"=== 302.ai Response Status: {response.status_code} ===")
        print(f"=== Response length: {len(response.text)} bytes ===")

        # 如果是批量摘要/洞察输入，尽力解析模型输出为目标结构
        if articles and response.ok:
            try:
                data = response.json()
                content = (
                    data.get('choices', [{}])[0]
                        .get('message', {})
                        .get('content', '')
                )
                # 模型可能在 JSON 外包裹 ```json ... ```，需要清理
                content = content.strip()
                if content.startswith('```json'):
                    content = content[7:]  # 去掉开头的 ```json
                if content.startswith('```'):
                    content = content[3:]
                if content.endswith('```'):
                    content = content[:-3]
                content = content.strip()
                
                parsed = json.loads(content)
                # 简单校验
                if isinstance(parsed, dict) and 'articles' in parsed:
                    result = {
                        'issueId': parsed.get('issueId') or (issue_id or 'unknown-issue'),
                        'articles': [
                            {
                                'id': str(it.get('id', '')),
                                'summary': it.get('summary', ''),
                                'insight': it.get('insight', ''),
                            }
                            for it in parsed.get('articles', [])
                        ]
                    }
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': cors_origin,
                            'Access-Control-Allow-Methods': 'POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Accept'
                        },
                        'body': json.dumps(result, ensure_ascii=False)
                    }
            except Exception as _:
                # 解析失败时，回落为原始返回，便于排查 prompt
                pass

        # 其它情况：原样透传（保持你原来的行为）
        return {
            'statusCode': response.status_code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': cors_origin,
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Accept'
            },
            'body': response.text
        }
    except requests.exceptions.Timeout:
        print("=== ERROR: Request timeout ===")
        return {
            'statusCode': 504,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': cors_origin,
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Accept'
            },
            'body': json.dumps({'error': 'Request timeout after 120 seconds'})
        }
    except Exception as e:
        print(f"=== ERROR: {type(e).__name__}: {str(e)} ===")
        import traceback
        print(f"=== Traceback: ===")
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': cors_origin,
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Accept'
            },
            'body': json.dumps({'error': f'Internal error: {str(e)}'})
        }