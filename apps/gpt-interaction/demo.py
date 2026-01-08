from DrissionPage import ChromiumPage, ChromiumOptions
from DrissionPage.common import Keys
import time
from pathlib import Path
from urllib.parse import urlparse

def enable_web_search(page) -> bool:
    """开启网页/联网搜索：点击加号，必要时再点“更多”，再选择“网页搜索/Web search”。"""
    def _dump(reason: str) -> None:
        try:
            debug_dir = Path('./logs/debug')
            debug_dir.mkdir(parents=True, exist_ok=True)
            ts = int(time.time())
            safe_reason = ''.join(c for c in reason if c.isalnum() or c in ('-', '_'))[:40] or 'debug'
            screenshot_path = debug_dir / f'demo_enable_search_{safe_reason}_{ts}.png'
            html_path = debug_dir / f'demo_enable_search_{safe_reason}_{ts}.html'
            try:
                page.get_screenshot(path=str(screenshot_path), full_page=True)
            except Exception:
                pass
            try:
                html = page.html
                html_path.write_text(html, encoding='utf-8')
            except Exception:
                pass
            print(f'[enable_web_search] 已保存调试文件: {screenshot_path} , {html_path}')
        except Exception:
            pass

    try:
        attach_selectors = [
            # Common aria-labels (button)
            '@@tag:button@@aria-label=Attach files',
            '@@tag:button@@aria-label=Attach',
            '@@tag:button@@aria-label=Add',
            '@@tag:button@@aria-label=添加附件',
            '@@tag:button@@aria-label=添加',
            '@@tag:button@@aria-label=附件',
            # Some builds use role=button on div
            '@@tag:div@@role=button@@aria-label=Attach files',
            '@@tag:div@@role=button@@aria-label=Attach',
            '@@tag:div@@role=button@@aria-label=添加附件',
            '@@tag:div@@role=button@@aria-label=添加',
            '@@tag:div@@role=button@@aria-label=附件',
            # data-testid variants
            '@data-testid=attach-button',
            '@data-testid=attachments-button',
            '@data-testid=attachment-button',
            '@data-testid=plus-button',
            # CSS fallbacks
            'css:button[aria-label*="Attach"]',
            'css:button[aria-label*="Add"]',
            'css:button[aria-label*="附件"]',
            'css:button[aria-label*="添加"]',
            'css:button[title*="Attach"]',
            'css:button[title*="Add"]',
            'css:button[title*="附件"]',
            'css:button[data-testid*="attach"]',
            'css:button[data-testid*="attachment"]',
            'css:div[role="button"][aria-label*="Attach"]',
            'css:div[role="button"][aria-label*="添加"]',
            'css:div[role="button"][aria-label*="附件"]',
        ]

        attach_btn = None
        attach_hit = None
        for sel in attach_selectors:
            try:
                ele = page.ele(sel, timeout=1)
                if ele and ele.states.is_displayed:
                    attach_btn = ele
                    attach_hit = sel
                    break
            except Exception:
                continue

        # Fallback: find prompt textarea -> its form -> pick the first visible button (excluding send)
        if not attach_btn:
            prompt = page.ele('#prompt-textarea', timeout=2) or \
                     page.ele('css:textarea[id="prompt-textarea"]', timeout=2) or \
                     page.ele('css:div[contenteditable="true"]', timeout=2)
            if prompt:
                try:
                    form = prompt.parent('tag:form')
                    if form:
                        buttons = form.eles('css:button')
                        for b in buttons:
                            if not b or not b.states.is_displayed:
                                continue
                            dt = ''
                            try:
                                dt = (b.attr('data-testid') or '').lower()
                            except Exception:
                                dt = ''
                            if 'send' in dt:
                                continue
                            attach_btn = b
                            attach_hit = 'fallback:form_first_visible_button'
                            break
                except Exception:
                    pass

        if not attach_btn:
            print('[enable_web_search] 未找到“+ / 附件”按钮')
            _dump('attach_not_found')
            return False

        print(f'[enable_web_search] 点击“+ / 附件”按钮（命中：{attach_hit}）')
        try:
            page.actions.move_to(attach_btn).click()
        except Exception:
            try:
                attach_btn.click()
            except Exception:
                attach_btn.click(by_js=True)
        time.sleep(0.6)

        def _find_search_option(timeout: int = 2):
            selectors = [
                'text=Web search',
                'text=Search the web',
                'text=网页搜索',
                'text=联网搜索',
            ]
            for sel in selectors:
                ele = page.ele(sel, timeout=timeout)
                if ele and ele.states.is_displayed:
                    return ele
            return None

        search_option = _find_search_option(timeout=1)
        if search_option:
            print('[enable_web_search] 直接找到“网页/联网搜索”选项，点击')
            search_option.click()
            time.sleep(0.5)
            return True

        more_option = page.ele('text=More', timeout=1) or page.ele('text=更多', timeout=1) or page.ele('text=More...', timeout=1)
        if more_option and more_option.states.is_displayed:
            print('[enable_web_search] 未直接找到搜索选项，悬停到“更多”展开子菜单')
            try:
                page.actions.move_to(more_option)
            except Exception:
                pass
            time.sleep(0.6)
            search_option = _find_search_option(timeout=2)
            if search_option:
                print('[enable_web_search] 在“更多”子菜单中找到“网页/联网搜索”选项，移动并点击')
                try:
                    page.actions.move_to(search_option).click()
                except Exception:
                    search_option.click()
                time.sleep(0.5)
                return True

            # Last resort: some UIs require click to open submenu (but yours may auto-close)
            try:
                print('[enable_web_search] 悬停未展开，尝试点击“更多”（兜底）')
                more_option.click()
                time.sleep(0.6)
                search_option = _find_search_option(timeout=2)
                if search_option:
                    try:
                        page.actions.move_to(search_option).click()
                    except Exception:
                        search_option.click()
                    time.sleep(0.5)
                    return True
            except Exception:
                pass

        # Sometimes menu doesn't open on first click; retry once.
        print('[enable_web_search] 未找到搜索选项，重试打开菜单一次')
        try:
            page.actions.move_to(attach_btn).click()
        except Exception:
            try:
                attach_btn.click()
            except Exception:
                attach_btn.click(by_js=True)
        time.sleep(0.6)

        search_option = _find_search_option(timeout=1)
        if search_option:
            search_option.click()
            time.sleep(0.5)
            return True
        more_option = page.ele('text=More', timeout=1) or page.ele('text=更多', timeout=1) or page.ele('text=More...', timeout=1)
        if more_option and more_option.states.is_displayed:
            try:
                page.actions.move_to(more_option)
            except Exception:
                pass
            time.sleep(0.6)
            search_option = _find_search_option(timeout=2)
            if search_option:
                try:
                    page.actions.move_to(search_option).click()
                except Exception:
                    search_option.click()
                time.sleep(0.5)
                return True

        print('[enable_web_search] 最终仍未找到“网页/联网搜索”选项')
        _dump('search_option_not_found')
        return False
    except Exception:
        _dump('exception')
        return False

def get_sources(page):
    """尝试查找并点击来源按钮，获取引用列表"""
    def _dump(reason: str) -> None:
        try:
            debug_dir = Path('./logs/debug')
            debug_dir.mkdir(parents=True, exist_ok=True)
            ts = int(time.time())
            safe_reason = ''.join(c for c in reason if c.isalnum() or c in ('-', '_'))[:40] or 'debug'
            screenshot_path = debug_dir / f'get_sources_{safe_reason}_{ts}.png'
            html_path = debug_dir / f'get_sources_{safe_reason}_{ts}.html'
            try:
                page.get_screenshot(path=str(screenshot_path), full_page=True)
            except Exception:
                pass
            try:
                html = page.html
                html_path.write_text(html, encoding='utf-8')
            except Exception:
                pass
            print(f'[get_sources] 已保存调试文件: {screenshot_path} , {html_path}')
        except Exception:
            pass

    print("[get_sources] 正在查找来源按钮...")
    
    # 强力滚动逻辑
    print("[get_sources] 尝试滚动到底部...")
    try:
        # 1. 尝试滚动特定的对话容器 (针对 ChatGPT 结构)
        # 查找所有 overflow-y-auto 的 div，通常最后一个是对话区域
        scrollable_divs = page.eles('css:div[class*="overflow-y-auto"]')
        if scrollable_divs:
            target_div = scrollable_divs[-1]
            target_div.scroll.to_bottom()
            time.sleep(0.5)
        
        # 2. 模拟键盘 End 键 (兜底)
        page.ele('tag:body').click() # 聚焦页面
        page.actions.type(Keys.END)
        time.sleep(0.5)
    except Exception:
        pass

    # 常见来源按钮特征
    source_btn = page.ele('text:来源', timeout=3) or \
                 page.ele('text:Sources', timeout=3) or \
                 page.ele('@data-testid=source-button', timeout=3)
    
    if not source_btn:
        # 有时候是 "x 来源"
        source_btn = page.ele('text:个来源', timeout=1) or page.ele('text:sources', timeout=1)

    if not source_btn:
        print("[get_sources] 未找到来源按钮")
        _dump('source_btn_not_found')
        return []

    print("[get_sources] 找到来源按钮，点击展开...")
    
    # 定义查找侧边栏的函数
    def _find_sidebar():
        # 查找侧边栏/弹出层
        # 标题通常是 "引用" 或 "Sources"
        # 增加查找范围，包括 h2, h3, div 等
        candidates = page.eles('text:引用') or page.eles('text:Sources')
        if not candidates:
            return None
        
        # 过滤：侧边栏标题通常在页面右侧，或者层级较深
        # 优先找可见的，且位置靠后的（通常侧边栏在 DOM 后面）
        for t in reversed(candidates):
            if t.states.is_displayed:
                # 简单的启发式：侧边栏标题通常不会太长
                if len(t.text) > 20: 
                    continue
                return t
        return None

    # 尝试点击并等待侧边栏出现
    # 尝试最多 2 次点击
    for attempt in range(2):
        try:
            if attempt == 0:
                # 第一次尝试：模拟鼠标点击（更真实）
                print("[get_sources] 尝试点击 (Actions)...")
                page.actions.move_to(source_btn).click()
            else:
                # 第二次尝试：JS 点击（强力）
                print("[get_sources] 尝试点击 (JS)...")
                source_btn.click(by_js=True)
        except Exception as e:
            print(f"[get_sources] 点击异常: {e}")
        
        # 轮询等待侧边栏出现
        print("[get_sources] 等待侧边栏出现...")
        for _ in range(10): # 等待 5 秒
            time.sleep(0.5)
            sidebar_title = _find_sidebar()
            if sidebar_title:
                print("[get_sources] 检测到侧边栏标题")
                break
        
        if sidebar_title:
            break
        else:
            print("[get_sources] 未检测到侧边栏，准备重试点击...")
    
    if not sidebar_title:
        print("[get_sources] 最终未找到引用侧边栏")
        _dump('sidebar_not_found')
        return []
    
    # 尝试定位包含链接的容器
    # 动态向上查找，直到找到一个包含一定数量链接的容器
    container = None
    try:
        current_ele = sidebar_title
        # 向上找最多 6 层
        for i in range(1, 7):
            parent = current_ele.parent()
            if not parent or parent.tag in ('body', 'html'):
                break
            
            # 检查该容器内的有效链接数量
            # 注意：这里排除内部导航，且不再强制要求可见（兼容动画中的 opacity: 0）
            sub_links = parent.eles('tag:a')
            valid_count = 0
            for l in sub_links:
                url = l.link
                if url and _is_valid_source_url(url):
                    valid_count += 1
            
            print(f"[get_sources] 层级 +{i} ({parent.tag}): 发现 {valid_count} 个有效链接")
            
            if valid_count >= 1: # 只要找到至少1个有效链接，就认为可能是正确的容器
                # 但为了保险，我们可能希望找包含更多链接的父级（如果引用很多）
                # 这里采用贪婪策略：如果当前层级链接数比上一层多，就继续往上找？
                # 简化策略：找到第一个包含链接的容器后，再往上找一层，以防漏掉兄弟节点的链接
                container = parent
                # 再往上找一层试试，看是否更多
                try:
                    grandparent = parent.parent()
                    if grandparent and grandparent.tag not in ('body', 'html'):
                        gp_links = grandparent.eles('tag:a')
                        gp_valid_count = sum(1 for l in gp_links if l.states.is_displayed and l.link and l.link.startswith('http') and 'chatgpt.com' not in l.link)
                        if gp_valid_count > valid_count:
                            container = grandparent
                            print(f"[get_sources] 升级到层级 +{i+1}: 发现 {gp_valid_count} 个有效链接")
                except:
                    pass
                break
            
            current_ele = parent

    except Exception as e:
        print(f"[get_sources] 获取父容器失败: {e}")
    
    if not container:
        print("[get_sources] 未找到合适的侧边栏容器，尝试全页搜索")
        container = page
    
    # 提取链接 - 多种策略
    results = []
    seen_urls = set()
    
    def _extract_url_from_element(ele):
        """从元素的各种属性中提取 URL"""
        url = None
        # 尝试多种属性
        for attr_name in ['href', 'alt', 'data-url', 'data-href', 'data-link', 'src']:
            try:
                val = ele.attr(attr_name)
                if val and val.startswith('http'):
                    url = val
                    break
            except:
                pass
        # 也尝试 DrissionPage 的 link 属性
        if not url:
            try:
                url = ele.link
            except:
                pass
        return url
    
    def _is_valid_source_url(url):
        """判断是否为有效的引用来源 URL"""
        if not url or not url.startswith('http'):
            return False
        
        try:
            parsed = urlparse(url)
            host = parsed.netloc.lower()
            # 过滤 ChatGPT 内部链接 (检查域名而非整个 URL，防止误伤 utm_source=chatgpt.com)
            if host.endswith('chatgpt.com') or host.endswith('openai.com'):
                return False
            
            # 过滤噪音
            exclude_patterns = [
                'twitter.com/intent', 'facebook.com/sharer', 'linkedin.com/shareArticle',
                'cdn-cgi'
            ]
            for pattern in exclude_patterns:
                if pattern in url:
                    return False
            return True
        except:
            return False
    
    # 策略1: 查找所有带 alt 属性包含 http 的元素（ChatGPT 特有）
    print("[get_sources] 策略1: 查找 alt 属性中的链接...")
    alt_elements = container.eles('css:[alt*="http"]')
    print(f"[get_sources] 找到 {len(alt_elements)} 个 alt 属性含 http 的元素")
    
    for ele in alt_elements:
        url = ele.attr('alt')
        if not _is_valid_source_url(url):
            continue
        # 清理 URL（去掉 utm 参数等追踪信息，可选）
        # 获取标题：尝试从父级或兄弟元素获取
        title = ele.text or ''
        if not title or len(title) < 3:
            # 尝试从父级获取文本
            try:
                parent = ele.parent()
                if parent:
                    title = parent.text or ''
            except:
                pass
        if not title or len(title) < 3:
            title = url
        
        if url not in seen_urls:
            title = title.replace('\n', ' ').strip()[:200] or url  # 限制标题长度
            results.append({'title': title, 'url': url})
            seen_urls.add(url)
            print(f"[get_sources] 提取到: {title[:40]}... -> {url[:60]}...")
    
    # 策略2: 查找标准 <a> 标签的 href
    if not results:
        print("[get_sources] 策略1未找到链接，尝试策略2: 标准 href...")
        links = container.eles('tag:a')
        print(f"[get_sources] 找到 {len(links)} 个 <a> 标签")
        
        for link in links:
            url = _extract_url_from_element(link)
            if not _is_valid_source_url(url):
                continue
            title = link.text or link.attr('aria-label') or link.attr('title') or url
            if url not in seen_urls:
                title = title.replace('\n', ' ').strip()[:200] or url
                results.append({'title': title, 'url': url})
                seen_urls.add(url)
    
    # 策略3: 全页面搜索带 alt 含 http 的元素
    if not results:
        print("[get_sources] 策略2未找到链接，尝试策略3: 全页面搜索 alt 链接...")
        all_alt_elements = page.eles('css:[alt*="http"]')
        print(f"[get_sources] 全页面找到 {len(all_alt_elements)} 个 alt 属性含 http 的元素")
        
        for ele in all_alt_elements:
            url = ele.attr('alt')
            if not _is_valid_source_url(url):
                continue
            title = ele.text or ''
            if not title or len(title) < 3:
                try:
                    parent = ele.parent()
                    if parent:
                        title = parent.text or ''
                except:
                    pass
            if not title or len(title) < 3:
                title = url
            
            if url not in seen_urls:
                title = title.replace('\n', ' ').strip()[:200] or url
                results.append({'title': title, 'url': url})
                seen_urls.add(url)
    
    if not results:
        print("[get_sources] 未能从侧边栏提取到有效链接")
        _dump('no_links_found')
    else:
        print(f"[get_sources] 成功提取 {len(results)} 个引用来源")
            
    return results

def main():
    # 1. 配置浏览器
    co = ChromiumOptions()
    # 设置用户数据路径，保存登录状态
    co.set_user_data_path(r'./user_chatgpt_data') 
    # 如果需要隐藏浏览器，可以取消下面这行的注释
    # co.set_argument('--headless') 

    # 2. 启动浏览器
    page = ChromiumPage(co)

    try:
        # 3. 打开 ChatGPT
        print("正在打开 ChatGPT...")
        page.get('https://chatgpt.com')

        # 处理可能出现的“保持退出状态”弹窗
        stay_logged_out_btn = page.ele('text:Stay logged out', timeout=6) or \
                              page.ele('text:保持退出状态', timeout=6)
        if stay_logged_out_btn:
            print("检测到登录提示，点击“保持退出状态”...")
            stay_logged_out_btn.click()

        # 4. 检测是否需要登录
        # 增加等待，确保页面加载
        # 使用多种定位方式检测登录按钮
        login_indicators = page.ele('text:Log in', timeout=5) or \
                           page.ele('text:登录', timeout=5) or \
                           page.ele('@data-testid=login-button', timeout=5)

        if login_indicators or "auth.openai.com" in page.url:
            print("发现登录按钮或跳转至登录页，尝试自动登录...")
            
            # 简单的自动登录逻辑演示 (需要配置好环境变量或硬编码)
            # 注意：实际项目中建议使用 browser.py 中的封装逻辑
            email = "czyklein@outlook.com"           # 请替换
            password = "chen3099"        # 请替换
            
            if email == "" or password == "":
                print("请先在代码中设置好邮箱和密码")
                return
            
            if "auth.openai.com" not in page.url:
                # 尝试点击找到的登录按钮
                if login_indicators:
                    login_indicators.click()
                else:
                    # 兜底尝试
                    page.ele('text:Log in').click()
            
            # 输入邮箱
            email_input = page.ele("css:input[name='email']", timeout=10) or \
                          page.ele("css:input[type='email']", timeout=10)
            if email_input:
                email_input.input(email)
                
                # 点击继续按钮 (使用精确匹配 text= 以避免匹配到“继续使用 Google 登录”)
                continue_btn = page.ele("text=Continue") or \
                               page.ele("text=继续") or \
                               page.ele("css:button[type='submit']")
                
                if continue_btn:
                    print("模拟鼠标移动并点击继续...")
                    page.actions.move_to(continue_btn).click()
                else:
                    print("未找到继续按钮")
                
                # 等待密码框 (OpenAI 或 Microsoft)
                time.sleep(2)
                if "login.live.com" in page.url:
                    print("跳转至 Microsoft 登录...")
                    
                    # 检查是否需要选择“使用密码”
                    use_password_btn = page.ele("text:Use password") or \
                                       page.ele("text:使用密码")
                    if use_password_btn:
                        print("模拟鼠标移动并点击'使用密码'选项...")
                        page.actions.move_to(use_password_btn).click()
                        time.sleep(1)

                    # 输入密码
                    password_input = page.ele("css:input[name='passwd']", timeout=10) or \
                                     page.ele("css:input[type='password']", timeout=10)
                    
                    if password_input:
                        print("输入密码...")
                        password_input.input(password)
                        
                        submit_btn = page.ele("css:input[type='submit']") or \
                                     page.ele("css:button[type='submit']") or \
                                     page.ele("text:Sign in") or \
                                     page.ele("text:登录")
                        if submit_btn:
                            print("模拟鼠标移动并点击登录...")
                            page.actions.move_to(submit_btn).click()
                        
                        # 处理保持登录 (Stay signed in?)
                        print("等待'保持登录状态'提示...")
                        stay_signed_in = page.ele("text:Stay signed in?", timeout=10) or \
                                         page.ele("text:保持登录状态?", timeout=10) or \
                                         page.ele("text:是否保持登录状态?", timeout=10)
                        
                        if stay_signed_in:
                            # Microsoft 的“是”按钮通常 ID 为 idSIButton9
                            yes_btn = page.ele('#idSIButton9', timeout=5) or \
                                      page.ele("text=是") or \
                                      page.ele("text=Yes")
                            
                            if yes_btn:
                                print("模拟鼠标移动并点击'是'以保存状态...")
                                # 确保元素可见且可点击
                                if yes_btn.states.is_displayed:
                                    try:
                                        page.actions.move_to(yes_btn).click()
                                    except:
                                        # 如果模拟移动失败（例如元素在阴影 DOM 或布局特殊），尝试直接点击
                                        yes_btn.click()
                                else:
                                    # 如果元素不可见但存在，尝试用 JS 点击
                                    yes_btn.click(by_js=True)
                    else:
                        print("未找到 Microsoft 密码输入框")
                else:
                    print("OpenAI 密码登录...")
                    password_input = page.ele("css:input[name='password']", timeout=10) or \
                                     page.ele("css:input[type='password']", timeout=10)
                    if password_input:
                        password_input.input(password)
                        login_btn = page.ele("text:Log in") or page.ele("text:登录") or \
                                    page.ele("css:button[type='submit']")
                        if login_btn:
                            print("模拟鼠标移动并点击登录...")
                            page.actions.move_to(login_btn).click()
                    else:
                        print("未找到 OpenAI 密码输入框")
                
                # 等待登录完成并跳转到对话页面
                print("等待跳转到对话页面...")
                # page.wait 是等待器对象，没有 ele 方法。直接使用 page.ele 并指定 timeout 即可实现等待元素出现。
                page.ele('#prompt-textarea', timeout=15)
            else:
                print("未找到邮箱输入框")

        # 5. 输入对话
        # 等待输入框出现
        if page.ele('#prompt-textarea', timeout=15):
            print("已进入对话页面")

            # 再次检查是否有弹窗遮挡
            stay_logged_out_btn = page.ele('text:Stay logged out', timeout=2) or \
                                  page.ele('text:保持退出状态', timeout=1)
            if stay_logged_out_btn:
                print("再次检测到登录提示，点击“保持退出状态”...")
                stay_logged_out_btn.click()

            # 开启联网/网页搜索：先点加号，再（可能）点更多，最后点“网页搜索/Web search”
            if enable_web_search(page):
                print("已开启联网/网页搜索")
            else:
                print("未能开启联网/网页搜索（可能当前账号/模型不支持或 UI 变更）")


            textarea = page.ele('#prompt-textarea') or \
                       page.ele('css:textarea[id="prompt-textarea"]') or \
                       page.ele('css:div[contenteditable="true"]') # 兼容可能的 DOM 变化
            
            if textarea:
                print("正在输入提示词...")
                # 聚焦并输入
                textarea.click()
                textarea.input("我希望学习一下C#，可以从哪些方面入手？要注意什么？")
                time.sleep(1) # 等待输入事件触发，使发送按钮变为可用状态
            else:
                print("未找到输入框")
                return

            # 点击发送按钮
            # 使用 Actions 模拟鼠标移动到按钮再点击，更像真人操作
            send_btn = page.ele('@data-testid=send-button') or \
                       page.ele('css:button[data-testid="send-button"]') or \
                       page.ele('@@tag:button@@aria-label=Send prompt')
            
            # 检查按钮是否存在且可用（未被禁用）
            if send_btn and send_btn.states.is_enabled:
                print("正在模拟鼠标移动并点击发送...")
                try:
                    page.actions.move_to(send_btn).click()
                except:
                    send_btn.click(by_js=True)
                print("消息已发送 (点击按钮)")
            else:
                print("发送按钮未找到或不可用，尝试使用回车键发送...")
                textarea.focus()
                page.actions.type(Keys.ENTER)
                print("消息已发送 (回车键)")

            # 6. 获取回复
            print("等待 AI 回复中...")

            # 逻辑：轮询检查“停止生成”按钮是否消失
            # 每一段时间检查一次，如果AI还没响应完成，就继续等待直到完成或超时
            start_time = time.time()
            timeout = 360  # 设置超时时间
            
            while time.time() - start_time < timeout:
                # 检查停止按钮是否存在
                if not page.ele('@data-testid=stop-button'):
                    # 停止按钮消失，可能已经完成
                    # 稍微等待再次检查，防止闪烁
                    time.sleep(0.5)
                    if not page.ele('@data-testid=stop-button'):
                        print("AI 回复生成完成")
                        break
                
                # 还在生成中，等待一小段时间继续检查
                time.sleep(5)
            else:
                print("等待 AI 回复超时")

            # 稍微等一下 DOM 渲染完成
            page.wait(2)

            # 获取最后一条回复
            # 尝试多种选择器以适应不同版本
            res_elements = page.eles('@data-message-author-role=assistant') or \
                           page.eles('.markdown') or \
                           page.eles('.prose') or \
                           page.eles('css:div[data-message-author-role="assistant"]')

            if res_elements:
                last_assistant = res_elements[-1]
                # 滚动到最后一条回复，确保底部的“来源”按钮加载并可见
                print("[main] 正在滚动到最后一条回复...")
                try:
                    last_assistant.scroll.to_see()
                except Exception as e:
                    print(f"[main] 滚动失败: {e}，尝试通用滚动...")
                    page.scroll.to_bottom()
                time.sleep(1)

                print("\nAI 回复内容:")
                # 取最后一个 assistant 的回复，并过滤掉可能的空白
                last_reply = last_assistant.text
                print(last_reply)

                # 尝试获取来源并读取
                sources = get_sources(page)
                if sources:
                    print(f"\n发现 {len(sources)} 个来源:")
                    for i, src in enumerate(sources):
                        print(f"\n--- 来源 [{i+1}] ---")
                        print(f"标题: {src['title']}")
                        print(f"链接: {src['url']}")
                else:
                    print("\n未检测到来源信息 (可能未使用联网搜索或未找到按钮)")
            else:
                print("未找到回复内容，正在保存调试信息...")
                # 调试辅助 1: 截取当前页面，看看 AI 到底回复了没
                page.get_screenshot(path='debug_screenshot.png', full_page=True)
                # 调试辅助 2: 保存页面源码，方便分析最新的 HTML 标签
                with open('debug_page_source.html', 'w', encoding='utf-8') as f:
                    f.write(page.html)
                print("已保存 debug_screenshot.png 和 debug_page_source.html，请检查。")
        else:
            print("未能进入对话界面，请检查网络或登录状态。")

    except Exception as e:
        print(f"运行过程中出现错误: {e}")
    finally:
        # 如果不想让浏览器关闭，可以注释掉下面这行
        # page.quit()
        print("\n任务结束。")

if __name__ == '__main__':
    main()