from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:8080")

    # Bypass tutorial and set locale
    page.evaluate("window.localStorage.setItem('patrimonio_tutorial_done', '1')")
    page.evaluate("window.localStorage.setItem('patrimonio_locale', 'en')")
    page.reload()

    page.wait_for_timeout(1000)

    # Focus the first dividend item to show the focus-visible ring
    # Wait for the dividend list to appear
    page.wait_for_selector('text=Dividend Calendar')

    # Get the first item
    first_item = page.locator('div.divide-y > div[role="button"]').first
    first_item.wait_for(state="visible")
    first_item.focus()

    page.wait_for_timeout(1000)

    # Take screenshot showing the focus ring
    page.screenshot(path="verification.png")
    page.wait_for_timeout(500)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/app/videos")
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
