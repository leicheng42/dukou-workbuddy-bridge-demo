from pathlib import Path
import os
import tempfile
import zipfile

from playwright.sync_api import sync_playwright


def main() -> None:
    output = Path("/tmp/dukou-workbuddy-demo.png")
    modal_output = Path("/tmp/dukou-workbuddy-modal.png")
    demo_url = os.environ.get("DEMO_URL", "http://127.0.0.1:5173")
    chrome_path = os.environ.get(
        "CHROME_PATH", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    )
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=chrome_path)
        page = browser.new_page(viewport={"width": 1440, "height": 960})
        page.goto(demo_url, wait_until="networkidle")

        page.get_by_role("button", name="模拟 Dukou 转发").click()
        page.get_by_test_id("composer").wait_for(state="visible")
        page.get_by_text("转发内容", exact=True).first.click()
        page.get_by_role("dialog").wait_for(state="visible")
        page.wait_for_timeout(350)
        page.screenshot(path=str(modal_output), full_page=True)
        page.get_by_role("button", name="关闭预览").click()

        page.get_by_test_id("send").click()
        page.get_by_test_id("summary").wait_for(state="visible")
        page.locator(".conversation__scroll").evaluate(
            "(element) => { element.scrollTop = element.scrollHeight; }"
        )
        page.wait_for_timeout(350)
        page.screenshot(path=str(output), full_page=True)

        assert page.get_by_text("已解析 7 条消息").is_visible()
        assert page.get_by_text("可能待办").is_visible()
        assert page.locator(".highlight-row").count() >= 2
        assert page.locator(".action-row").count() >= 1

        with tempfile.TemporaryDirectory() as temp_dir:
            archive = Path(temp_dir) / "聊天记录_e2e.zip"
            with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
                bundle.writestr(
                    "聊天记录.txt",
                    "阿禾\n2026-10-28 09:47:00\n明天下午三点前发最终材料。\n\n"
                    "林舟\n2026-10-28 09:49:00\n收到，我来补链路图。\n",
                )
            upload_page = browser.new_page(viewport={"width": 1280, "height": 900})
            upload_page.goto(demo_url, wait_until="networkidle")
            upload_page.get_by_test_id("file-input").set_input_files(str(archive))
            upload_page.get_by_text("2 条消息", exact=True).first.wait_for(state="visible")
            assert upload_page.get_by_text("聊天记录_e2e.zip", exact=False).first.is_visible()
            upload_page.get_by_test_id("send").click()
            upload_page.get_by_test_id("summary").get_by_text(
                "已解析 2 条消息", exact=True
            ).wait_for(state="visible")
            upload_page.close()

        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        mobile.goto(demo_url, wait_until="networkidle")
        mobile.get_by_role("button", name="模拟 Dukou 转发").click()
        mobile.get_by_text("转发内容", exact=True).first.wait_for(state="visible")
        dimensions = mobile.evaluate(
            "() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth })"
        )
        assert dimensions["scroll"] <= dimensions["client"] + 1
        mobile.screenshot(path="/tmp/dukou-workbuddy-mobile.png", full_page=True)
        mobile.close()

        browser.close()
    print(output)
    print(modal_output)


if __name__ == "__main__":
    main()
