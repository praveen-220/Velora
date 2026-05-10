from PIL import Image
import sys
import os

def process_image(path):
    if not os.path.exists(path):
        return
    img = Image.open(path).convert("RGBA")
    data = img.getdata()
    # Replace white-ish pixels with transparent
    # using a small threshold to catch compression artifacts
    new_data = [
        (255, 255, 255, 0) if item[0] > 240 and item[1] > 240 and item[2] > 240 else item
        for item in data
    ]
    img.putdata(new_data)
    img.save(path)
    print(f"Processed {path}")

process_image('client/public/logo.png')
process_image('frontend/logo.png')
