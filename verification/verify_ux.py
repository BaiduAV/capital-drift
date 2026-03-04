from playwright.sync_api import sync_playwright

def verify_tooltips():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:8080")

        # Wait for the app to load
        page.wait_for_selector("text=PATRIMÔNIO")

        # Find the sidebar toggle button by its initial aria-label
        # Initially collapsed is false, so label should be "Collapse menu" or "Recolher menu"
        # Let's try to hover over it to see the tooltip

        # Taking a screenshot of the initial state
        page.screenshot(path="verification/initial_state.png")
        print("Initial state screenshot taken.")

        # Find the sidebar toggle button
        # It's the button with ChevronLeft since it's expanded by default
        toggle_btn = page.locator("button:has(svg.lucide-chevron-left)")

        # Check aria-label
        aria_label = toggle_btn.get_attribute("aria-label")
        print(f"Initial aria-label: {aria_label}")

        # Hover to trigger tooltip
        toggle_btn.hover()
        page.wait_for_timeout(500) # Wait for tooltip animation

        # Take screenshot with tooltip
        page.screenshot(path="verification/tooltip_expanded.png")
        print("Tooltip (expanded) screenshot taken.")

        # Click to collapse
        toggle_btn.click()
        page.wait_for_timeout(500) # Wait for transition

        # Find the button again (now it has ChevronRight)
        toggle_btn_collapsed = page.locator("button:has(svg.lucide-chevron-right)")

        # Check new aria-label
        aria_label_collapsed = toggle_btn_collapsed.get_attribute("aria-label")
        print(f"Collapsed aria-label: {aria_label_collapsed}")

        # Hover to trigger tooltip
        toggle_btn_collapsed.hover()
        page.wait_for_timeout(500)

        # Take screenshot with tooltip
        page.screenshot(path="verification/tooltip_collapsed.png")
        print("Tooltip (collapsed) screenshot taken.")

        # Verify Mobile Menu Button aria-label (hidden on desktop but accessible in DOM)
        # We can simulate mobile view
        page.set_viewport_size({"width": 375, "height": 667})
        page.wait_for_timeout(500)

        menu_btn = page.locator("button:has(svg.lucide-menu)")
        mobile_aria_label = menu_btn.get_attribute("aria-label")
        print(f"Mobile menu aria-label: {mobile_aria_label}")

        page.screenshot(path="verification/mobile_view.png")

        browser.close()

if __name__ == "__main__":
    verify_tooltips()
