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

        # --- STUDENT LOGIN & ORDERING ---
        print("Logging in as Student...")
        # Fill in phone number field (which handles email in our updated logic if we type it)
        # Note: The UI label says "Phone Number" but input accepts text.
        # We need to find the input.
        # Login flow: Role -> Uni -> Credentials.
        # But our AuthContext handles student@unimonday.com regardless of role/uni if logic is correct.
        # However, the UI wizard forces steps.

        # Step 1: Role
        page.click("text=Student")
        page.click("text=Next Step")

        # Step 2: University
        page.select_option("select", "UDSM")
        page.click("text=Next")

        # Step 3: Credentials
        page.fill("input[placeholder='+255 700 000 000']", "student@unimonday.com")
        page.fill("input[placeholder='Enter OTP (Simulated)']", "password123")
        page.click("button:has-text('Login')")

        print("Verifying Home Page...")
        page.wait_for_url("**/home")
        page.screenshot(path="verification/1_student_home.png")

        # Check Essentials Icons (Pastel Colors)
        # Just check if Dining is present.
        print("Navigating to Dining...")
        page.click("text=Dining")
        page.wait_for_url("**/dining")
        page.screenshot(path="verification/2_dining_list.png")

        # Select Mama Shavu (ID 1)
        print("Selecting Mama Shavu...")
        # Need to find link to /merchant/1. The mock data has ID "1".
        # Link usually wraps the card.
        page.click("text=Mama Shavu's Kitchen")
        page.wait_for_url("**/merchant/1")
        page.screenshot(path="verification/3_merchant_profile.png")

        # Add Item to Cart
        print("Adding Item to Cart...")
        # Find first "Add" button.
        page.click("button:has-text('Add')")

        # Checkout
        print("Proceeding to Checkout...")
        page.click("button:has-text('Checkout')")
        page.wait_for_url("**/checkout")
        page.screenshot(path="verification/4_checkout.png")

        # Fill Checkout Form
        print("Filling Payment Details...")
        page.fill("input[placeholder='e.g. Juma Juma']", "Test Juma")
        page.fill("input[placeholder='e.g. 07XXXXXXXX']", "0700111222")

        # Submit
        print("Submitting Order...")
        page.click("button:has-text('I Have Sent Payment')")
        page.wait_for_url("**/orders")
        page.screenshot(path="verification/5_orders_pending.png")

        # Verify Pending State
        if page.is_visible("text=Waiting for vendor confirmation"):
            print("Verified: Order is pending.")
        else:
            print("Error: Pending message not found.")

        # Logout
        # Need to find logout button or clear storage.
        # Assuming Profile -> Logout or just clearing context.
        context.clear_cookies()
        page.evaluate("localStorage.removeItem('unimonday_user')")
        page.goto("http://localhost:5173/login")

        # --- VENDOR LOGIN & CONFIRMATION ---
        print("Logging in as Vendor...")
        # Step 1: Role
        page.click("text=Partner with Us") # Merchant Role
        page.click("text=Next Step")

        # Step 2: University
        page.select_option("select", "UDSM")
        page.click("text=Next")

        # Step 3: Credentials
        page.fill("input[placeholder='+255 700 000 000']", "vendor@unimonday.com")
        page.fill("input[placeholder='Enter OTP (Simulated)']", "password123")
        page.click("button:has-text('Login')")

        print("Verifying Vendor Dashboard...")
        page.wait_for_url("**/merchant-dashboard")
        page.screenshot(path="verification/6_vendor_dashboard.png")

        # Go to Verification Tab
        print("Navigating to Verification Tab...")
        page.click("text=verification")

        # Search for Order
        print("Searching for Order...")
        page.fill("input[placeholder='Search Payment Name...']", "Test Juma")
        page.wait_for_timeout(1000) # Wait for filter
        page.screenshot(path="verification/7_vendor_verification.png")

        # Confirm Order
        print("Confirming Order...")
        if page.is_visible("text=Test Juma"):
            page.click("button:has-text('Confirm Payment')")
            print("Order Confirmed.")
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/8_vendor_confirmed.png")
        else:
            print("Error: Order not found in vendor dashboard.")

        # Logout Vendor
        context.clear_cookies()
        page.evaluate("localStorage.removeItem('unimonday_user')")
        page.goto("http://localhost:5173/login")

        # --- STUDENT REDEMPTION ---
        print("Logging in as Student (Again)...")
        # Step 1: Role
        page.click("text=Student")
        page.click("text=Next Step")
        # Step 2: University
        page.select_option("select", "UDSM")
        page.click("text=Next")
        # Step 3: Credentials
        page.fill("input[placeholder='+255 700 000 000']", "student@unimonday.com")
        page.fill("input[placeholder='Enter OTP (Simulated)']", "password123")
        page.click("button:has-text('Login')")

        print("Checking My Orders...")
        page.wait_for_url("**/home")
        page.goto("http://localhost:5173/orders") # Navigate directly or via menu
        page.wait_for_url("**/orders")
        page.screenshot(path="verification/9_orders_confirmed.png")

        # Verify Activate Pickup Button
        if page.is_visible("text=Activate Pickup"):
            print("Verified: Activate Pickup button visible.")
            page.click("text=Activate Pickup")
            print("Activated Coupon. Waiting for 15s timer...")
            page.screenshot(path="verification/10_redemption_modal.png")

            # Verify Modal Content
            if page.is_visible("text=Valid Coupon"):
                print("Verified: Modal is visible.")

            # Wait for expiration (15s + buffer)
            page.wait_for_timeout(16000)
            page.screenshot(path="verification/11_redemption_expired.png")

            if page.is_visible("text=CONSUMED"):
                print("Verified: Coupon is CONSUMED.")
            else:
                 print("Error: CONSUMED status not found.")
        else:
            print("Error: Activate Pickup button not found (Order might not be confirmed).")

        browser.close()
        print("Test Complete.")

if __name__ == "__main__":
    run()
