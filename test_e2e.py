from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_i18n():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)
    
    try:
        driver.get('http://localhost:5000/app')
        time.sleep(2) # let it redirect to / if not logged in
        
        # We don't need to log in to see translations on the login page!
        # The login page has a placeholder. Let's check its direction.
        # But wait, the user specifically mentioned "Add guest user" text.
        # So we need to log in.
        
        driver.get('http://localhost:5000/')
        time.sleep(1)
        driver.execute_script("document.getElementById('loginUsername').value = 'test'")
        driver.execute_script("document.getElementById('loginPassword').value = 'password'")
        driver.execute_script("login()")
        
        time.sleep(2)
        driver.get('http://localhost:5000/app')
        time.sleep(2)
        
        # Test "Add guest user"
        # It's in the add-guest-btn span
        # Wait, the add-guest-btn is inside a modal or a specific screen.
        # But we can just set the language using translations.js function
        driver.execute_script("setLanguage('en')")
        time.sleep(1)
        
        # Check placeholder direction
        input_el = driver.find_element(By.ID, "desc") # expense what
        dir_val = input_el.get_attribute('dir')
        print(f"EN direction for input: {dir_val}")
        
        # Check "Add guest user" text
        guest_btn = driver.execute_script("return document.querySelector('[data-i18n=\"add_guest_user\"]').textContent")
        print(f"EN guest user text: {guest_btn}")
        
        # Switch to Hebrew
        driver.execute_script("setLanguage('he')")
        time.sleep(1)
        
        dir_val_he = driver.find_element(By.ID, "desc").get_attribute('dir')
        print(f"HE direction for input: {dir_val_he}")
        
        guest_btn_he = driver.execute_script("return document.querySelector('[data-i18n=\"add_guest_user\"]').textContent")
        print(f"HE guest user text: {guest_btn_he}")

    finally:
        driver.quit()

if __name__ == '__main__':
    test_i18n()
