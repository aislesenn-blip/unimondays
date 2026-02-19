import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to App...")
        page.goto("http://localhost:5173/login")
        page.wait_for_load_state("networkidle")

        # --- LOGIN AS STUDENT ---
        print("Logging in as Student...")
        page.click("text=Student")
        page.click("text=Next Step")
        page.select_option("select", "UDSM")
        page.click("text=Next")
        page.fill("input[placeholder='+255 700 000 000']", "student@unimonday.com")
        page.fill("input[placeholder='Enter OTP (Simulated)']", "password123")
        page.click("button:has-text('Login')")

        print("Verifying Home Page & Trending Now...")
        page.wait_for_url("**/home")
        page.screenshot(path="verification/12_home_trending.png")

        # Verify "Trending Now" Section Exists
        if page.is_visible("text=Trending Now"):
            print("Verified: 'Trending Now' section is visible.")
        else:
            print("Error: 'Trending Now' section not found.")

        # --- STATIONARY FLOW ---
        print("Selecting Stationary Vendor (Library Print)...")
        # Find UDSM Main Library Print (ID 4). In Trending or via Print category.
        # Let's try finding it in Trending first, or navigate to Print.
        page.click("text=Print")
        page.wait_for_url("**/print")
        page.screenshot(path="verification/13_print_list.png")

        print("Clicking Vendor...")
        page.click("text=UDSM Main Library Print")
        page.wait_for_url("**/merchant/4")
        page.screenshot(path="verification/14_stationary_profile.png")

        # Verify Turnaround Badge
        if page.is_visible("text=Instant"):
             print("Verified: Turnaround Time 'Instant' badge visible.")

        # Click Submit Custom Task
        print("Clicking Submit Custom Task...")
        page.click("button:has-text('Submit Custom Task')")
        page.wait_for_url("**/submit-task")
        page.screenshot(path="verification/15_submit_task_form.png")

        # Fill Form
        print("Filling Task Form...")
        page.fill("textarea", "Please print 10 pages in color.")
        page.fill("input[type='number']", "5000")
        page.fill("input[placeholder='Name on SimCard']", "Test Student")

        # Submit
        print("Submitting Task...")
        page.click("button:has-text('Submit Order')")
        page.wait_for_url("**/orders")
        page.screenshot(path="verification/16_orders_sim_pending.png")

        # Verify Pending
        if page.is_visible("text=Waiting for vendor confirmation"):
             print("Verified: Order is initially PENDING.")

        # Wait for 3-Second Simulation
        print("Waiting 4 seconds for auto-confirmation...")
        page.wait_for_timeout(4000)
        page.screenshot(path="verification/17_orders_sim_confirmed.png")

        # Verify Confirmed & Activate Button
        if page.is_visible("text=Activate Pickup"):
             print("Verified: Order auto-confirmed and Activate Pickup visible.")

             # Activate
             page.click("text=Activate Pickup")
             print("Activated Coupon. Waiting for timer...")
             page.screenshot(path="verification/18_redemption_card.png")

             # Wait for expiration
             page.wait_for_timeout(16000)
             page.screenshot(path="verification/19_redemption_expired.png")

             if page.is_visible("text=CONSUMED"):
                 print("Verified: Coupon CONSUMED.")
        else:
             print("Error: Auto-confirmation failed.")

        browser.close()
        print("Stationary Simulation Test Complete.")

if __name__ == "__main__":
    run()
