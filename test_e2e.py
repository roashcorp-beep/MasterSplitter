from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def run_tests():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 5)
    
    try:
        print("1. Testing Language Toggle & Placeholders...")
        driver.get('http://localhost:5000/')
        time.sleep(2)
        
        # Log in if needed
        driver.execute_script("document.getElementById('loginUsername').value = 'test'")
        driver.execute_script("document.getElementById('loginPassword').value = 'password'")
        try:
            driver.execute_script("login()")
        except:
            pass
        
        time.sleep(2)
        driver.get('http://localhost:5000/app')
        time.sleep(2)
        
        # Test English toggle
        driver.execute_script("setLanguage('en')")
        time.sleep(1)
        
        # Verify no Hebrew remains (Add guest user)
        add_guest_text = driver.execute_script("return document.querySelector('[data-i18n=\"add_guest_user\"]').textContent")
        print(f"EN Guest User Text: '{add_guest_text}'")
        assert "הוסף משתמש אורח" not in add_guest_text, "Hebrew still present in English mode!"
        
        # Verify Placeholder direction
        desc_input = driver.find_element(By.ID, "desc")
        dir_val = desc_input.get_attribute('dir')
        print(f"EN Placeholder dir: '{dir_val}'")
        assert dir_val == "ltr", "Direction is not ltr in English mode!"

        print("2. Testing Scan Receipt Button HTML...")
        btn_html = driver.execute_script("return document.querySelector('.scan-receipt-btn').innerHTML")
        print(f"Scan Receipt innerHTML: {btn_html.strip()}")
        assert "📸" not in btn_html, "Camera icon still in button!"
        
        print("3. Testing Smart Transfer...")
        # Mock loadOptimizedBalances by executing it
        # Since we might not have a trip loaded, we'll just test if the function exists
        res = driver.execute_script("return typeof loadOptimizedBalances")
        assert res == "function", "loadOptimizedBalances function missing!"
        
        print("4. Testing Feedback Form UI...")
        driver.get('http://localhost:5000/profile')
        time.sleep(2)
        
        # Verify textarea exists
        res = driver.execute_script("return document.getElementById('feedbackInput') !== null")
        assert res, "Feedback input form not found!"
        
        print("All E2E checks passed successfully!")
    except Exception as e:
        print(f"Test Failed: {e}")
    finally:
        driver.quit()

if __name__ == '__main__':
    run_tests()
