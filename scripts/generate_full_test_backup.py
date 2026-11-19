#!/usr/bin/env python3
"""
Generate a complete, high-quality, realistic Froshiar test backup JSON file
with 100 diverse products, working CDN image URLs, batch tracking,
installments, customer & supplier debts, receipts, and operating expenses.
"""

import json
import uuid
import datetime
import random

# Seed for reproducible realistic data
random.seed(42)

def make_uuid():
    return str(uuid.uuid4())

def iso_date(days_ago=0, hours_ago=0):
    dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_ago, hours=hours_ago)
    return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')

def short_date(days_ago=0):
    dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_ago)
    return dt.strftime('%Y-%m-%d')

EXCHANGE_RATE = 1510.0  # 100 USD = 151,000 IQD

# ─── 1. Business & Settings ──────────────────────────────────────────────────
business = {
    "id": 1,
    "name": "فرۆشگای مۆدێرن - لقی سەرەکی",
    "type": "تەکنەلۆژیا و بازرگانی گشتی",
    "phone": "0750 123 4567",
    "address": "هەولێر - شەقامی ١٠٠ مەتری - بەرامبەر فامیلی مۆڵ",
    "logo_path": "https://images.unsplash.com/photo-1542744094-3a31727223ec?auto=format&fit=crop&w=400&q=80",
    "created_at": iso_date(180)
}

# ─── 2. Categories ───────────────────────────────────────────────────────────
categories_data = [
    "مۆبایل و تابلێت",
    "لاپتۆپ و کۆمپیوتەر",
    "کەرەستەی دەنگی و بیستۆک",
    "کاتژمێری زیرەک و ئێکسسوارات",
    "کامێرا و وێنەگری",
    "پۆشاک و جلوبەرگی پیاوان",
    "پۆشاک و پێداویستی ئافرەتان",
    "بۆن و جوانکاری",
    "کەرەستەی ماڵ و مەتبەخ",
    "یاری ئەلیکترۆنی و گەیمینگ"
]
categories = [{"id": i + 1, "name": name, "created_at": iso_date(180)} for i, name in enumerate(categories_data)]

# ─── 3. Suppliers ────────────────────────────────────────────────────────────
suppliers_raw = [
    {"name": "کۆمپانیای ئاسیا بۆ تەکنەلۆژیا", "phone": "07504441122", "address": "هەولێر - بازاڕی نیشتمان", "notes": "دابینکەری سەرەکی ئەپڵ و سامسۆنگ"},
    {"name": "بازرگانی جیهان مۆبایل", "phone": "07703332211", "address": "سلێمانی - شەقامی سالمی", "notes": "بریکاری فەرمی ئەکسسوارات و بارگاوی کەرەوە"},
    {"name": "گروپی کۆمپیوتەری هەولێر", "phone": "07505553344", "address": "هەولێر - عەنکاوە", "notes": "دابینکەری لاپتۆپی دەڵ و ئەسوس"},
    {"name": "کۆمپانیای ستایلی مۆدێرن", "phone": "07512229988", "address": "دهۆک - بازاڕی مازی مۆڵ", "notes": "هاوردەکاری پۆشاکی تورکی و ئەوروپی"},
    {"name": "بازرگانی ئەڵماس بۆ بۆن و جوانکاری", "phone": "07718884455", "address": "سلێمانی - تووی مەلیك", "notes": "بۆنی فەڕەنسی و براندە جیهانییەکان"},
    {"name": "تەکنۆ گەیمینگ کوردستان", "phone": "07507776655", "address": "کەرکووک - ڕێگای بەغدا", "notes": "پلەیستەیشن و ئێکس بۆکس و گەیمینگ"},
    {"name": "دابینکاری کارەبایی زاگرۆس", "phone": "07501118899", "address": "هەولێر - بازاڕی تەعجیل", "notes": "کەرەستەی ناوماڵ و ئامێری کارەبایی"},
    {"name": "کۆمپانیای پرۆ کامێرا", "phone": "07709991122", "address": "سلێمانی - شەقامی مەولەوی", "notes": "کامێرای کانۆن و سۆنی و درۆن"},
]
suppliers = []
for i, s in enumerate(suppliers_raw):
    suppliers.append({
        "id": i + 1,
        "uuid": make_uuid(),
        "name": s["name"],
        "phone": s["phone"],
        "address": s["address"],
        "notes": s["notes"],
        "total_spent": 0,
        "created_at": iso_date(170 - i * 10),
        "updated_at": iso_date(5)
    })

# ─── 4. Customers ────────────────────────────────────────────────────────────
customers_raw = [
    {"name": "ئاری عوسمان محەمەد", "phone": "07501112233", "address": "هەولێر - بەختیاری"},
    {"name": "دڵنیا کەریم ئەحمەد", "phone": "07702223344", "address": "سلێمانی - ڕاپەڕین"},
    {"name": "ڕێباز خەلیل حەسەن", "phone": "07513334455", "address": "دهۆک - شۆڕش"},
    {"name": "شێرکۆ جەلال قادر", "phone": "07504445566", "address": "کەرکووک - ڕەحیماوا"},
    {"name": "سۆما عەبدولڕەحمان", "phone": "07715556677", "address": "هەڵەبجە - شەهیدان"},
    {"name": "کاروان عەزیز مستەفا", "phone": "07506667788", "address": "هەولێر - ڕاستی"},
    {"name": "نیان ئیبراهیم تەها", "phone": "07707778899", "address": "سلێمانی - توی مەلیك"},
    {"name": "بڕوا فەرهاد حەمە", "phone": "07518889900", "address": "زاخۆ - بێدارێ"},
    {"name": "هێمن تەها مەحمود", "phone": "07509990011", "address": "سۆران - دلۆپە"},
    {"name": "لانە یاسین ساڵح", "phone": "07721113355", "address": "هەولێر - ئەسعەدی"},
    {"name": "هەڵگورد کەمال نوری", "phone": "07502224466", "address": "سلێمانی - بەختیاری"},
    {"name": "پەروا عومەر مەجید", "phone": "07703335577", "address": "کەرکووک - قۆریە"},
    {"name": "ئاسۆ جەبار حوسێن", "phone": "07514446688", "address": "هەولێر - ٥ حەسارۆک"},
    {"name": "سەنگەر حەمید ڕەشید", "phone": "07505557799", "address": "دهۆک - ئیسکان"},
    {"name": "چۆمان سەڵاح ئەنوەر", "phone": "07716668800", "address": "سلێمانی - چوارچرا"},
    {"name": "سۆزان فەتاح نامیق", "phone": "07507779911", "address": "هەولێر - ئیمپایەر وۆرڵد"},
    {"name": "دانا بەختیار قاسم", "phone": "07708880022", "address": "سلێمانی - سەرچنار"},
    {"name": "لاڤە سامان بێستوون", "phone": "07519991133", "address": "هەولێر - گوندی ئیتاڵی"},
    {"name": "ڕێبین شێروان سەعید", "phone": "07501113344", "address": "دهۆک - مالتا"},
    {"name": "ڕەوەند جەمال سابیر", "phone": "07702224455", "address": "سلێمانی - ئابڵاخ"},
]
customers = []
for i, c in enumerate(customers_raw):
    customers.append({
        "id": i + 1,
        "uuid": make_uuid(),
        "name": c["name"],
        "phone": c["phone"],
        "address": c["address"],
        "notes": "کڕیاری ئاسایی و بەردەوام",
        "total_purchases": 0,
        "created_at": iso_date(160 - i * 5),
        "updated_at": iso_date(2)
    })

# ─── 5. 100 Realistic Products ───────────────────────────────────────────────
# Define 100 products across 10 categories with real Unsplash CDN images
raw_products_data = [
    # Category 1: مۆبایل و تابلێت (1-12)
    ("iPhone 16 Pro Max 256GB - Desert Titanium", "مۆبایل و تابلێت", 1650000, 1850000, 24, "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80", 1),
    ("iPhone 16 128GB - Ultramarine Blue", "مۆبایل و تابلێت", 1120000, 1260000, 30, "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80", 1),
    ("iPhone 15 Pro 128GB - Natural Titanium", "مۆبایل و تابلێت", 1320000, 1475000, 18, "https://images.unsplash.com/photo-1695048065051-7667ffaa25b9?auto=format&fit=crop&w=600&q=80", 1),
    ("Samsung Galaxy S24 Ultra 512GB - Titanium Gray", "مۆبایل و تابلێت", 1520000, 1720000, 20, "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=600&q=80", 1),
    ("Samsung Galaxy S24 Plus 256GB - Onyx Black", "مۆبایل و تابلێت", 1180000, 1340000, 22, "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80", 1),
    ("Samsung Galaxy A55 5G 256GB - Awesome Iceblue", "مۆبایل و تابلێت", 420000, 485000, 45, "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80", 2),
    ("iPad Pro 11-inch M4 Chip 256GB - Space Black", "مۆبایل و تابلێت", 1450000, 1640000, 15, "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80", 1),
    ("iPad Air 11-inch M2 Chip 128GB - Starlight", "مۆبایل و تابلێت", 860000, 980000, 25, "https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=600&q=80", 1),
    ("Xiaomi 14 Ultra 512GB - Photography Edition", "مۆبایل و تابلێت", 1280000, 1450000, 16, "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80", 2),
    ("Google Pixel 9 Pro 128GB - Porcelain White", "مۆبایل و تابلێت", 1310000, 1490000, 14, "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80", 2),
    ("OnePlus 12 512GB 16GB RAM - Emerald Green", "مۆبایل و تابلێت", 980000, 1120000, 20, "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=600&q=80", 2),
    ("iPad 10th Gen 64GB Wi-Fi - Silver", "مۆبایل و تابلێت", 480000, 545000, 35, "https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?auto=format&fit=crop&w=600&q=80", 1),

    # Category 2: لاپتۆپ و کۆمپیوتەر (13-22)
    ("MacBook Pro 14-inch M3 Pro 18GB/512GB", "لاپتۆپ و کۆمپیوتەر", 2650000, 2980000, 10, "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80", 3),
    ("MacBook Air 13-inch M3 8GB/256GB - Midnight", "لاپتۆپ و کۆمپیوتەر", 1480000, 1680000, 18, "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=600&q=80", 3),
    ("Dell XPS 15 OLED i7 13th Gen 32GB/1TB RTX 4060", "لاپتۆپ و کۆمپیوتەر", 2450000, 2790000, 8, "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80", 3),
    ("ASUS ROG Zephyrus G16 Ryzen 9 RTX 4070", "لاپتۆپ و کۆمپیوتەر", 2350000, 2690000, 7, "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80", 3),
    ("Lenovo ThinkPad X1 Carbon Gen 11 16GB/512GB", "لاپتۆپ و کۆمپیوتەر", 1950000, 2240000, 12, "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80", 3),
    ("HP Spectre x360 2-in-1 Touchscreen i7/16GB", "لاپتۆپ و کۆمپیوتەر", 1750000, 1990000, 11, "https://images.unsplash.com/photo-1544731612-de7f96afe55f?auto=format&fit=crop&w=600&q=80", 3),
    ("شاشەی گەیمینگ Samsung Odyssey G7 27-inch 240Hz", "لاپتۆپ و کۆمپیوتەر", 580000, 685000, 15, "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80", 3),
    ("ماوس و کیبۆردی بێتەل Logitech MX Master 3S", "لاپتۆپ و کۆمپیوتەر", 165000, 210000, 40, "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80", 3),
    ("هارد دیسکی دەرەکی SSD Samsung T7 Shield 1TB", "لاپتۆپ و کۆمپیوتەر", 135000, 175000, 50, "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80", 3),
    ("ڕاوتەری وایفای TP-Link Archer AX73 Wi-Fi 6", "لاپتۆپ و کۆمپیوتەر", 115000, 148000, 32, "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80", 3),

    # Category 3: کەرەستەی دەنگی و بیستۆک (23-32)
    ("AirPods Pro 2nd Gen USB-C Active Noise Cancellation", "کەرەستەی دەنگی و بیستۆک", 270000, 325000, 40, "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80", 1),
    ("AirPods 3rd Gen Wireless Charging Case", "کەرەستەی دەنگی و بیستۆک", 210000, 255000, 30, "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&w=600&q=80", 1),
    ("Sony WH-1000XM5 Wireless Noise Canceling Headphones", "کەرەستەی دەنگی و بیستۆک", 420000, 495000, 18, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80", 2),
    ("Bose QuietComfort 45 Wireless Headphones", "کەرەستەی دەنگی و بیستۆک", 380000, 445000, 15, "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80", 2),
    ("سپیکەری گەورەی JBL Boombox 3 Waterproof", "کەرەستەی دەنگی و بیستۆک", 460000, 545000, 14, "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80", 2),
    ("سپیکەری بلوتووسی JBL Charge 5 Portable", "کەرەستەی دەنگی و بیستۆک", 165000, 205000, 35, "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80", 2),
    ("Samsung Galaxy Buds 3 Pro AI Sound", "کەرەستەی دەنگی و بیستۆک", 240000, 290000, 25, "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80", 1),
    ("Anker Soundcore Space One ANC Headset", "کەرەستەی دەنگی و بیستۆک", 95000, 130000, 45, "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80", 2),
    ("مایکرۆفۆنی پڕۆفێشناڵ Rode Wireless GO II", "کەرەستەی دەنگی و بیستۆک", 320000, 385000, 20, "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80", 8),
    ("ساندباری تەلەفزیۆن JBL Cinema SB170 2.1ch", "کەرەستەی دەنگی و بیستۆک", 210000, 265000, 18, "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80", 2),

    # Category 4: کاتژمێری زیرەک و ئێکسسوارات (33-42)
    ("Apple Watch Ultra 2 GPS + Cellular 49mm Titanium", "کاتژمێری زیرەک و ئێکسسوارات", 980000, 1140000, 16, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80", 1),
    ("Apple Watch Series 9 45mm Midnight Aluminum", "کاتژمێری زیرەک و ئێکسسوارات", 490000, 575000, 24, "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80", 1),
    ("Samsung Galaxy Watch 6 Classic 47mm LTE", "کاتژمێری زیرەک و ئێکسسوارات", 360000, 430000, 22, "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80", 1),
    ("بارگاوی کەرەوەی بێتەل Apple MagSafe Charger 15W", "کاتژمێری زیرەک و ئێکسسوارات", 45000, 62000, 80, "https://images.unsplash.com/photo-1622445262464-84b14e0745b3?auto=format&fit=crop&w=600&q=80", 2),
    ("پاوەربانکی خێرا Anker 737 PowerBank 24000mAh 140W", "کاتژمێری زیرەک و ئێکسسوارات", 145000, 185000, 35, "https://images.unsplash.com/photo-1609592424364-c2c62c1f440b?auto=format&fit=crop&w=600&q=80", 2),
    ("بارگاوی کەرەوەی سەفەری Anker GaNPrime 65W Fast", "کاتژمێری زیرەک و ئێکسسوارات", 42000, 58000, 90, "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80", 2),
    ("کەڤەری ئۆرجیناڵ Apple iPhone 16 FineWoven Case", "کاتژمێری زیرەک و ئێکسسوارات", 55000, 75000, 60, "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=600&q=80", 2),
    ("پاوەربانکی مۆبایل Baseus Magnetic MagSafe 10000mAh", "کاتژمێری زیرەک و ئێکسسوارات", 38000, 52000, 65, "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=600&q=80", 2),
    ("ستاندی مۆبایل و ئایپاد لە ئەلەمنیۆم Ugreen Stand", "کاتژمێری زیرەک و ئێکسسوارات", 18000, 26000, 75, "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=600&q=80", 2),
    ("قایشی کاتژمێری ئەپڵ چەرمی سروشتی Leather Band", "کاتژمێری زیرەک و ئێکسسوارات", 25000, 38000, 50, "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80", 2),

    # Category 5: کامێرا و وێنەگری (43-50)
    ("کامێرای پڕۆفێشناڵ Sony A7 IV Full-Frame Mirrorless", "کامێرا و وێنەگری", 2750000, 3100000, 6, "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80", 8),
    ("کامێرای Canon EOS R6 Mark II 4K 60p", "کامێرا و وێنەگری", 2600000, 2950000, 5, "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=600&q=80", 8),
    ("درۆنی زیرەک DJI Mini 4 Pro Fly More Combo", "کامێرا و وێنەگری", 1250000, 1420000, 12, "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80", 8),
    ("گیمبڵی دەستی کامێرا DJI RS 3 Pro Gimbal", "کامێرا و وێنەگری", 720000, 830000, 14, "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80", 8),
    ("کامێرای ئەکشن GoPro HERO12 Black Waterproof", "کامێرا و وێنەگری", 480000, 560000, 18, "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=600&q=80", 8),
    ("هاوێنەی کامێرا Sony FE 24-70mm f/2.8 GM II", "کامێرا و وێنەگری", 2150000, 2480000, 6, "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=600&q=80", 8),
    ("ڕۆشنایی ستۆدیۆ Godox SL60W LED Video Light", "کامێرا و وێنەگری", 145000, 185000, 22, "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80", 8),
    ("تڕایپۆدی کاربۆن فایبەر Manfrotto Carbon Tripod", "کامێرا و وێنەگری", 195000, 245000, 16, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80", 8),

    # Category 6: پۆشاک و جلوبەرگی پیاوان (51-60)
    ("چاکەتی زستانەی پیاوانەی چەرمی ڕاستەقینە", "پۆشاک و جلوبەرگی پیاوان", 115000, 165000, 30, "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80", 4),
    ("کراسی پیاوانەی فەرمی پەمۆ Massimo Dutti", "پۆشاک و جلوبەرگی پیاوان", 38000, 58000, 50, "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80", 4),
    ("پانتۆڵی کەتانی پیاوانە زارە Zara Chino", "پۆشاک و جلوبەرگی پیاوان", 32000, 48000, 45, "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=600&q=80", 4),
    ("تیشێرتی ئۆرجیناڵی Polo Ralph Lauren Slim Fit", "پۆشاک و جلوبەرگی پیاوان", 42000, 65000, 60, "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80", 4),
    ("سویتەری پاییزەی قاوەیی پیاوانەی H&M", "پۆشاک و جلوبەرگی پیاوان", 26000, 42000, 40, "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80", 4),
    ("پێڵاوی وەرزشی Nike Air Force 1 '07 All White", "پۆشاک و جلوبەرگی پیاوان", 110000, 150000, 35, "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80", 4),
    ("پێڵاوی فەرمی چەرمی پیاوانە Clarks Oxford", "پۆشاک و جلوبەرگی پیاوان", 85000, 125000, 25, "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=600&q=80", 4),
    ("قایش و جزدانی پیاوانەی سێت Tommy Hilfiger", "پۆشاک و جلوبەرگی پیاوان", 35000, 52000, 40, "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80", 4),
    ("چاکەتی باراناوی پیاوانەی The North Face", "پۆشاک و جلوبەرگی پیاوان", 125000, 175000, 22, "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=600&q=80", 4),
    ("بەرگی دەستی وەرزشی ئەدیداس Tracksuit Originals", "پۆشاک و جلوبەرگی پیاوان", 75000, 110000, 28, "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80", 4),

    # Category 7: پۆشاک و پێداویستی ئافرەتان (61-70)
    ("جانتا و کانتەی چەرمی ئافرەتانەی Michael Kors", "پۆشاک و پێداویستی ئافرەتان", 145000, 198000, 20, "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80", 4),
    ("جانتا دەستی زارە Zara Shoulder Bag Black", "پۆشاک و پێداویستی ئافرەتان", 38000, 56000, 35, "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80", 4),
    ("عەزی فەرمی ئێواران ئافرەتانەی ئاوریشم", "پۆشاک و پێداویستی ئافرەتان", 78000, 115000, 25, "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=600&q=80", 4),
    ("پێڵاوی پاژنەبەرزی سوور ئافرەتانەی کلاسیک", "پۆشاک و پێداویستی ئافرەتان", 52000, 78000, 28, "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80", 4),
    ("پێڵاوی وەرزشی ژنانەی Adidas Ultraboost Light", "پۆشاک و پێداویستی ئافرەتان", 125000, 168000, 30, "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80", 4),
    ("چاکەتی زستانەی پەنبە پڕفۆرمینگ ژنانە Mango", "پۆشاک و پێداویستی ئافرەتان", 85000, 128000, 20, "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80", 4),
    ("ملوانکە و گەردەنبەندی زێڕینی کریستاڵی Swarovski", "پۆشاک و پێداویستی ئافرەتان", 95000, 140000, 24, "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80", 5),
    ("دەسڕی ئاوریشمی ژنانەی Guccy Silk Scarf", "پۆشاک و پێداویستی ئافرەتان", 42000, 64000, 35, "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=600&q=80", 4),
    ("پانتۆڵی قوماشی ژنانەی مۆدێرنی زارا", "پۆشاک و پێداویستی ئافرەتان", 34000, 52000, 40, "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=600&q=80", 4),
    ("کاتژمێری ژنانەی زێڕینی Michael Kors Runway", "پۆشاک و پێداویستی ئافرەتان", 165000, 225000, 18, "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80", 5),

    # Category 8: بۆن و جوانکاری (71-80)
    ("بۆنی پیاوانەی ئۆرجیناڵ Dior Sauvage Eau de Parfum 100ml", "بۆن و جوانکاری", 175000, 225000, 35, "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80", 5),
    ("بۆنی شاهانەی Creed Aventus 100ml", "بۆن و جوانکاری", 380000, 465000, 15, "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80", 5),
    ("بۆنی ژنانەی شانێل Chanel Coco Mademoiselle 100ml", "بۆن و جوانکاری", 195000, 245000, 28, "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=600&q=80", 5),
    ("بۆنی پیاوانەی Tom Ford Tobacco Vanille 50ml", "بۆن و جوانکاری", 240000, 298000, 16, "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80", 5),
    ("بۆنی هاوینەی پیاوانەی Giorgio Armani Acqua Di Gio", "بۆن و جوانکاری", 135000, 175000, 32, "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=600&q=80", 5),
    ("سێتی سوراوی ماتی ماك MAC Matte Lipstick 6-Pack", "بۆن و جوانکاری", 65000, 92000, 45, "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80", 5),
    ("کرێمی چاککەرەوە و شێدارکەرەوەی پێست La Mer 60ml", "بۆن و جوانکاری", 185000, 235000, 20, "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80", 5),
    ("سیرۆمی ڤیتامین سی ڕوخسار The Ordinary C 30ml", "بۆن و جوانکاری", 14000, 22000, 75, "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80", 5),
    ("ئامێری چاککردن و وشککردنەوەی قژی Dyson Supersonic", "بۆن و جوانکاری", 480000, 565000, 12, "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80", 5),
    ("سێتی فڵچەی مکیاجی پڕۆفێشناڵ Real Techniques 8pcs", "بۆن و جوانکاری", 25000, 38000, 50, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80", 5),

    # Category 9: کەرەستەی ماڵ و مەتبەخ (81-90)
    ("ئامێری قاوەساز Delonghi Magnifica S Espresso", "کەرەستەی ماڵ و مەتبەخ", 485000, 570000, 15, "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=600&q=80", 7),
    ("قاوەسازی فلتەری بێ دەنگ Philips Drip Coffee Maker", "کەرەستەی ماڵ و مەتبەخ", 65000, 88000, 30, "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80", 7),
    ("گسکی زیرەکی ڕۆبۆت Xiaomi Robot Vacuum S10", "کەرەستەی ماڵ و مەتبەخ", 280000, 345000, 20, "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=600&q=80", 7),
    ("فڕنی بێ زەیتی دیجیتالی Ninja Air Fryer XL 5.2L", "کەرەستەی ماڵ و مەتبەخ", 145000, 188000, 28, "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80", 7),
    ("میکڕۆوەیڤی زیرەک Samsung 40L Ceramic Interior", "کەرەستەی ماڵ و مەتبەخ", 175000, 220000, 16, "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80", 7),
    ("سێتی مەنجەڵی گرانایتی تورکی 9 پارچە Tefal", "کەرەستەی ماڵ و مەتبەخ", 125000, 168000, 24, "https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?auto=format&fit=crop&w=600&q=80", 7),
    ("خەڵاتەی دەستی پڕۆفێشناڵ Braun MultiQuick 9 1200W", "کەرەستەی ماڵ و مەتبەخ", 115000, 152000, 25, "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=80", 7),
    ("ئوتووی هەڵمی زیرەک Philips Azur 3000W Steam Iron", "کەرەستەی ماڵ و مەتبەخ", 62000, 85000, 35, "https://images.unsplash.com/photo-1489274495757-95c7c837b37d?auto=format&fit=crop&w=600&q=80", 7),
    ("چاوسازی کارەبایی شووشەیی لید Karaca Glass Kettle", "کەرەستەی ماڵ و مەتبەخ", 32000, 46000, 45, "https://images.unsplash.com/photo-1594213114663-dd95ff3739bf?auto=format&fit=crop&w=600&q=80", 7),
    ("تەرازووی ژیرباوەڕی لەش Smart Body Scale Bluetooth", "کەرەستەی ماڵ و مەتبەخ", 22000, 34000, 55, "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80", 7),

    # Category 10: یاری ئەلیکترۆنی و گەیمینگ (91-100)
    ("کۆنسۆڵی یاری PlayStation 5 Slim 1TB Digital", "یاری ئەلیکترۆنی و گەیمینگ", 580000, 665000, 25, "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80", 6),
    ("کۆنسۆڵی یاری Xbox Series X 1TB True 4K", "یاری ئەلیکترۆنی و گەیمینگ", 620000, 715000, 18, "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=600&q=80", 6),
    ("کۆنسۆڵی سەفەری Nintendo Switch OLED Model White", "یاری ئەلیکترۆنی و گەیمینگ", 390000, 455000, 20, "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=600&q=80", 6),
    ("دەسکی کۆنترۆڵی بێتەل PS5 DualSense Wireless Controller", "یاری ئەلیکترۆنی و گەیمینگ", 85000, 108000, 40, "https://images.unsplash.com/photo-1592840496073-e72bbe619680?auto=format&fit=crop&w=600&q=80", 6),
    ("دەسکی کۆنترۆڵی مایکرۆسۆفت Xbox Wireless Controller Carbon", "یاری ئەلیکترۆنی و گەیمینگ", 75000, 96000, 35, "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=600&q=80", 6),
    ("هێدسێتی گەیمینگ HyperX Cloud III Wireless 7.1", "یاری ئەلیکترۆنی و گەیمینگ", 145000, 185000, 25, "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=600&q=80", 6),
    ("کیبۆردی گەیمینگ میکانیکی Razer BlackWidow V4 RGB", "یاری ئەلیکترۆنی و گەیمینگ", 165000, 215000, 22, "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80", 6),
    ("ماوسی گەیمینگ بێتەل Logitech G Pro X Superlight 2", "یاری ئەلیکترۆنی و گەیمینگ", 175000, 225000, 26, "https://images.unsplash.com/photo-1626218174358-7769486c4b79?auto=format&fit=crop&w=600&q=80", 6),
    ("کورسی گەیمینگ ئەرگۆنۆمیکی چەرم Cougar Armor Pro", "یاری ئەلیکترۆنی و گەیمینگ", 235000, 295000, 12, "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=600&q=80", 6),
    ("یاری FC 25 (FIFA 25) بۆ پلەیستەیشن 5 دیسك", "یاری ئەلیکترۆنی و گەیمینگ", 82000, 98000, 60, "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80", 6),
]

products = []
purchases = []
purchase_items = []
purchase_debts = []
debt_payments = []
inventory_history = []

for idx, p_raw in enumerate(raw_products_data):
    p_id = idx + 1
    p_name = p_raw[0]
    p_cat = p_raw[1]
    p_buy_iqd = p_raw[2]
    p_sell_iqd = p_raw[3]
    p_qty = p_raw[4]
    p_img = p_raw[5]
    supp_id = p_raw[6]
    supp = suppliers[supp_id - 1]

    # Deliberate low stock for 4 items to test low stock alerts
    if p_id in [15, 35, 45, 75]:
        p_qty = random.randint(1, 3)

    item_sku = f"B{1000 + p_id}"
    p_uuid = make_uuid()

    # Create matching purchase bill (batch 1)
    purch_id = p_id
    purch_num = f"PUR-{1000 + purch_id}"
    purch_date = short_date(random.randint(20, 150))
    purch_qty = p_qty + random.randint(5, 20)  # Total purchased > current stock
    line_total = purch_qty * p_buy_iqd

    # Expiry date: for electronics 2 years, for perfumes/beauty 1 year, for some items near expiry (10-25 days)
    if p_id in [77, 78, 79, 88, 89]: # near expiry batches for testing (10-25 days)
        exp_date = short_date(-random.randint(10, 25))
    else:
        exp_date = short_date(-random.randint(200, 700))

    prod_date = short_date(random.randint(60, 200))

    # Payment status for purchase
    is_debt_purchase = (p_id % 7 == 0)
    pay_status = 'partial' if is_debt_purchase else 'paid'

    purchases.append({
        "id": purch_id,
        "uuid": make_uuid(),
        "purchase_number": purch_num,
        "date": purch_date,
        "supplier_id": supp_id,
        "supplier_name": supp["name"],
        "supplier_phone": supp["phone"],
        "supplier_address": supp["address"],
        "product_name": p_name,
        "category": p_cat,
        "quantity": purch_qty,
        "buy_price_iqd": p_buy_iqd,
        "buy_price_usd": round(p_buy_iqd / EXCHANGE_RATE, 2),
        "sell_price_iqd": p_sell_iqd,
        "sell_price_usd": round(p_sell_iqd / EXCHANGE_RATE, 2),
        "total_iqd": line_total,
        "profit_iqd": (p_sell_iqd - p_buy_iqd) * purch_qty,
        "exchange_rate": EXCHANGE_RATE,
        "id_type": "repeatable",
        "item_ids": item_sku,
        "warranty": "١ ساڵ گەرەنتی فەرمی",
        "description": f"وەجبەی سەرەکی {p_name} بە کوالێتی بەرز",
        "notes": "وەجبەی هاوردەکراوی نوێ",
        "payment_status": pay_status,
        "production_date": prod_date,
        "expiry_date": exp_date,
        "created_at": iso_date(random.randint(20, 150)),
        "updated_at": iso_date(10),
        "archived_at": None
    })

    purchase_items.append({
        "id": purch_id,
        "uuid": make_uuid(),
        "purchase_id": purch_id,
        "product_name": p_name,
        "category": p_cat,
        "quantity": purch_qty,
        "buy_price_iqd": p_buy_iqd,
        "buy_price_usd": round(p_buy_iqd / EXCHANGE_RATE, 2),
        "sell_price_iqd": p_sell_iqd,
        "sell_price_usd": round(p_sell_iqd / EXCHANGE_RATE, 2),
        "line_total_iqd": line_total,
        "id_type": "repeatable",
        "item_ids": item_sku,
        "production_date": prod_date,
        "expiry_date": exp_date,
        "created_at": iso_date(random.randint(20, 150))
    })

    if is_debt_purchase:
        paid_amt = round(line_total * 0.4)
        rem_amt = line_total - paid_amt
        p_debt_id = len(purchase_debts) + 1
        purchase_debts.append({
            "id": p_debt_id,
            "uuid": make_uuid(),
            "purchase_id": purch_id,
            "supplier_name": supp["name"],
            "supplier_phone": supp["phone"],
            "supplier_address": supp["address"],
            "purchase_number": purch_num,
            "original_amount": line_total,
            "paid_amount": paid_amt,
            "remaining_amount": rem_amt,
            "status": "active",
            "notes": f"قەرزی ماوە بۆ وەجبەی {p_name}",
            "last_payment_at": iso_date(15),
            "created_at": iso_date(35),
            "updated_at": iso_date(15)
        })

        if paid_amt > 0:
            debt_payments.append({
                "id": len(debt_payments) + 1,
                "uuid": make_uuid(),
                "debt_id": p_debt_id,
                "debt_type": "purchase",
                "amount": paid_amt,
                "remaining_after": rem_amt,
                "note": "پێشەکی پسوولەی کڕین",
                "event_type": "payment",
                "supplier_name": supp["name"],
                "reference_number": purch_num,
                "original_amount": line_total,
                "payment_method": "cash",
                "print_count": 0,
                "view_count": 0,
                "created_at": iso_date(35)
            })

    # Update supplier total spent
    supp["total_spent"] += line_total

    # Add product
    products.append({
        "id": p_id,
        "uuid": p_uuid,
        "name": p_name,
        "category": p_cat,
        "item_id": item_sku,
        "id_mode": "repeatable",
        "purchase_price": p_buy_iqd,
        "selling_price": p_sell_iqd,
        "quantity": p_qty,
        "unit": "دانە",
        "description": f"{p_name} ئۆرجیناڵ بە گەرەنتی تەواو",
        "production_date": prod_date,
        "expiry_date": exp_date,
        "is_active": 1,
        "created_at": iso_date(150 - idx),
        "updated_at": iso_date(2),
        "purchase_id": purch_id,
        "supplier_name": supp["name"],
        "supplier_phone": supp["phone"],
        "supplier_address": supp["address"],
        "purchase_date": purch_date,
        "payment_status": pay_status,
        "warranty": "١ ساڵ گەرەنتی",
        "notes": "کاڵای چالاک",
        "image_uri": p_img,
        "image_remote_url": p_img,
        "buy_price_usd": round(p_buy_iqd / EXCHANGE_RATE, 2),
        "sell_price_usd": round(p_sell_iqd / EXCHANGE_RATE, 2),
        "low_stock_threshold": 5,
        "low_stock_enabled": 1,
        "store_visible": 1
    })

    inventory_history.append({
        "id": p_id,
        "uuid": make_uuid(),
        "product_id": p_id,
        "purchase_id": purch_id,
        "change_type": "in",
        "quantity_change": purch_qty,
        "new_quantity": p_qty,
        "reason": "داخڵکردنی وەجبەی نوێ لە کڕینەوە",
        "notes": f"وەجبەی {purch_num}",
        "created_at": iso_date(100 - idx)
    })

# Add second batches for 10 products to test multi-batch!
multi_batch_indices = [0, 1, 3, 12, 13, 22, 32, 50, 70, 90]
for idx in multi_batch_indices:
    orig_p = products[idx]
    batch_purch_id = len(purchases) + 1
    batch_purch_num = f"PUR-{1000 + batch_purch_id}"
    batch_qty = 15
    batch_buy = round(orig_p["purchase_price"] * 1.05)
    batch_sell = orig_p["selling_price"]
    batch_total = batch_qty * batch_buy
    supp = suppliers[0]

    purchases.append({
        "id": batch_purch_id,
        "uuid": make_uuid(),
        "purchase_number": batch_purch_num,
        "date": short_date(random.randint(5, 25)),
        "supplier_id": 1,
        "supplier_name": supp["name"],
        "supplier_phone": supp["phone"],
        "supplier_address": supp["address"],
        "product_name": orig_p["name"],
        "category": orig_p["category"],
        "quantity": batch_qty,
        "buy_price_iqd": batch_buy,
        "buy_price_usd": round(batch_buy / EXCHANGE_RATE, 2),
        "sell_price_iqd": batch_sell,
        "sell_price_usd": round(batch_sell / EXCHANGE_RATE, 2),
        "total_iqd": batch_total,
        "profit_iqd": (batch_sell - batch_buy) * batch_qty,
        "exchange_rate": EXCHANGE_RATE,
        "id_type": "repeatable",
        "item_ids": orig_p["item_id"],
        "warranty": "١ ساڵ گەرەنتی",
        "description": f"وەجبەی دووەمی {orig_p['name']}",
        "notes": "وەجبەی پڕکردنەوەی کۆگا",
        "payment_status": "paid",
        "production_date": orig_p["production_date"],
        "expiry_date": orig_p["expiry_date"],
        "created_at": iso_date(15),
        "updated_at": iso_date(5),
        "archived_at": None
    })

    purchase_items.append({
        "id": batch_purch_id,
        "uuid": make_uuid(),
        "purchase_id": batch_purch_id,
        "product_name": orig_p["name"],
        "category": orig_p["category"],
        "quantity": batch_qty,
        "buy_price_iqd": batch_buy,
        "buy_price_usd": round(batch_buy / EXCHANGE_RATE, 2),
        "sell_price_iqd": batch_sell,
        "sell_price_usd": round(batch_sell / EXCHANGE_RATE, 2),
        "line_total_iqd": batch_total,
        "id_type": "repeatable",
        "item_ids": orig_p["item_id"],
        "production_date": orig_p["production_date"],
        "expiry_date": orig_p["expiry_date"],
        "created_at": iso_date(15)
    })

# ─── 6. Sales, Sale Items, Debts, Installments & Payments ───────────────────
sales = []
sale_items = []
debts = []

for s_idx in range(60):
    sale_id = s_idx + 1
    inv_num = f"INV-{1000 + sale_id}"
    days_ago = max(0, int((59 - s_idx) * 2.2)) # spread across ~130 days
    cust = customers[s_idx % len(customers)]

    # Determine sale type:
    # 0..30: Cash sales
    # 31..45: Debt sales
    # 46..59: Installment sales
    if s_idx < 32:
        pay_method = 'cash'
    elif s_idx < 46:
        pay_method = 'debt'
    else:
        pay_method = 'installment'

    # Select 1 to 3 items per sale
    num_items = 1 if s_idx % 3 == 0 else (2 if s_idx % 3 == 1 else 3)
    picked_indices = [(s_idx * 2 + k) % len(products) for k in range(num_items)]

    subtotal = 0
    discount_total = 0

    cur_sale_items = []
    for k_item, p_idx in enumerate(picked_indices):
        p = products[p_idx]
        qty = 1 if p["selling_price"] > 500000 else random.randint(1, 3)
        item_disc = 5000 if (s_idx + k_item) % 4 == 0 and p["selling_price"] > 50000 else 0
        line_tot = (qty * p["selling_price"]) - item_disc

        subtotal += (qty * p["selling_price"])
        discount_total += item_disc

        cur_sale_items.append({
            "id": len(sale_items) + k_item + 1,
            "uuid": make_uuid(),
            "sale_id": sale_id,
            "product_id": p["id"],
            "product_name": p["name"],
            "item_id": p["item_id"],
            "id_mode": "repeatable",
            "purchase_price": p["purchase_price"],
            "selling_price": p["selling_price"],
            "quantity": qty,
            "discount": item_disc,
            "line_total": line_tot
        })

    # Optional global discount
    global_disc = 10000 if s_idx % 5 == 0 and subtotal > 150000 else 0
    grand_total = max(0, subtotal - discount_total - global_disc)

    installment_months = None
    installment_down = None
    installment_monthly = None

    if pay_method == 'cash':
        paid_amt = grand_total
        rem_debt = 0
        sale_status = 'completed'
    elif pay_method == 'debt':
        # Some debts partially paid, some fully unpaid
        paid_amt = round(grand_total * 0.3) if s_idx % 2 == 0 else 0
        rem_debt = grand_total - paid_amt
        sale_status = 'pending'
    else: # installment
        installment_months = 6 if s_idx % 2 == 0 else 12
        installment_down = round(grand_total * 0.25)
        paid_amt = installment_down
        rem_debt = grand_total - paid_amt
        installment_monthly = round(rem_debt / installment_months)
        sale_status = 'pending'

    sales.append({
        "id": sale_id,
        "uuid": make_uuid(),
        "invoice_number": inv_num,
        "customer_id": cust["id"],
        "customer_name": cust["name"],
        "customer_phone": cust["phone"],
        "customer_address": cust["address"],
        "warranty": "گەرەنتی بەپێی پسوولە",
        "notes": f"پسوولەی فرۆشتنی {inv_num}",
        "payment_method": pay_method,
        "subtotal": subtotal,
        "discount_total": discount_total + global_disc,
        "global_discount_type": "amount" if global_disc > 0 else "none",
        "global_discount": global_disc,
        "grand_total": grand_total,
        "paid_amount": paid_amt,
        "remaining_debt": rem_debt,
        "status": sale_status,
        "exchange_rate": EXCHANGE_RATE,
        "date": short_date(days_ago),
        "installment_months": installment_months,
        "installment_down_payment": installment_down,
        "installment_monthly_amount": installment_monthly,
        "created_at": iso_date(days_ago, random.randint(1, 10)),
        "updated_at": iso_date(days_ago)
    })

    sale_items.extend(cur_sale_items)
    cust["total_purchases"] += grand_total

    # Create debt record if debt or installment
    if rem_debt > 0 or pay_method in ['debt', 'installment']:
        debt_id = len(debts) + 1
        debt_status = 'active' if rem_debt > 0 else 'settled'
        debts.append({
            "id": debt_id,
            "uuid": make_uuid(),
            "sale_id": sale_id,
            "customer_name": cust["name"],
            "customer_phone": cust["phone"],
            "original_amount": grand_total,
            "paid_amount": paid_amt,
            "remaining_amount": rem_debt,
            "status": debt_status,
            "installment_months": installment_months,
            "installment_monthly_amount": installment_monthly,
            "last_payment_at": iso_date(max(0, days_ago - 5)),
            "created_at": iso_date(days_ago),
            "updated_at": iso_date(max(0, days_ago - 5))
        })

        # Add initial payment record if down payment / partial payment made
        if paid_amt > 0:
            debt_payments.append({
                "id": len(debt_payments) + 1,
                "uuid": make_uuid(),
                "debt_id": debt_id,
                "debt_type": "sales",
                "amount": paid_amt,
                "remaining_after": rem_debt,
                "note": "پێشەکی قیست" if pay_method == 'installment' else "پارەپێدانی سەرەتایی",
                "event_type": "payment",
                "customer_id": cust["id"],
                "reference_number": inv_num,
                "original_amount": grand_total,
                "payment_method": "cash",
                "print_count": 0,
                "view_count": 0,
                "created_by": "کاشێر - لقی سەرەکی",
                "created_at": iso_date(days_ago)
            })

            # For older installment sales, add 1 or 2 monthly payments!
            if pay_method == 'installment' and days_ago > 40 and rem_debt > installment_monthly:
                payment_1 = installment_monthly
                rem_debt -= payment_1
                debts[-1]["paid_amount"] += payment_1
                debts[-1]["remaining_amount"] = rem_debt
                sales[-1]["paid_amount"] += payment_1
                sales[-1]["remaining_debt"] = rem_debt

                debt_payments.append({
                    "id": len(debt_payments) + 1,
                    "uuid": make_uuid(),
                    "debt_id": debt_id,
                    "debt_type": "sales",
                    "amount": payment_1,
                    "remaining_after": rem_debt,
                    "note": "وەرگرتنی قیستی مانگانە",
                    "event_type": "payment",
                    "customer_id": cust["id"],
                    "reference_number": inv_num,
                    "original_amount": grand_total,
                    "payment_method": "cash",
                    "print_count": 0,
                    "view_count": 0,
                    "created_by": "کاشێر - لقی سەرەکی",
                    "created_at": iso_date(days_ago - 30)
                })

# ─── 7. Operating Expenses (40 realistic entries across 6 months) ───────────
expense_templates = [
    ("کرێی مانگانە", "کرێی بینای دووکان بۆ مانگ", 1200000),
    ("مووچەی کارمەندان", "مووچەی مانگانەی کاشێر و فرۆشیار", 1850000),
    ("کارەبا و مۆلیدە", "پارەی مۆلیدەی ئەهلی و کارەبای نیشتمانی", 240000),
    ("ئینتەرنێت و پەیوەندییەکان", "هێڵی فایبەر ئۆپتیک و پاکێجی پەیوەندی", 65000),
    ("ڕیکلام و سپۆنسەر", "سپۆنسەری فەیسبووك و ئینستاگرامی پەیج", 180000),
    ("گواستنەوە و تەکسی", "گواستنەوەی کاڵا لە گەراج و فرۆکەخانە", 45000),
    ("چاککردنەوە و چاکسازی", "چاککردنی تەبرید و دیکۆری دووکان", 95000),
    ("پێداویستی و میوانداری", "کڕینی قاوە و چا و کەرەستەی پاککەرەوە", 35000),
]

expenses = []
for exp_idx in range(40):
    t_idx = exp_idx % len(expense_templates)
    cat_name, reason_tmpl, base_amt = expense_templates[t_idx]
    days_ago = max(0, int((39 - exp_idx) * 3.3))
    # Variance in amount
    amt = base_amt + random.randint(-15000, 25000)

    expenses.append({
        "id": exp_idx + 1,
        "uuid": make_uuid(),
        "amount": amt,
        "category": cat_name,
        "reason": f"{reason_tmpl} ({short_date(days_ago)})",
        "note": "تۆمارکراو لە خەرجییە گشتییەکان",
        "date": short_date(days_ago),
        "created_at": iso_date(days_ago, 2),
        "updated_at": iso_date(days_ago)
    })

# ─── 8. Exchange Rates & Counters ───────────────────────────────────────────
exchange_rates = [
    {
        "id": 1,
        "rate": EXCHANGE_RATE,
        "updated_at": iso_date(1)
    }
]

invoice_counter = [{"id": 1, "last_number": len(sales)}]
purchase_counter = [{"id": 1, "last_number": len(purchases)}]

# ─── 9. Assemble Froshiar Backup Object ──────────────────────────────────────
backup_data = {
    "meta": {
        "schemaVersion": 3,
        "version": "2.1",
        "backupDate": iso_date(0),
        "appVersion": "1.0.1",
        "platform": "ios",
        "scope": "all"
    },
    "database": {
        "businesses": [business],
        "settings": [
            {"key": "online_store_enabled", "value": "1"},
            {"key": "online_store_bulk_publish_enabled", "value": "1"},
            {"key": "online_store_slug", "value": "modern-store"},
            {"key": "online_store_description", "value": "فرۆشگای مۆدێرن بۆ فرۆشتنی مۆبایل و تەکنەلۆژیا و کەلوپەلی کوالیتی بەرز"},
            {"key": "online_store_whatsapp", "value": "9647501234567"}
        ],
        "categories": categories,
        "products": products,
        "inventory_history": [],
        "customers": customers,
        "sales": sales,
        "sale_items": sale_items,
        "debts": debts,
        "invoice_counter": invoice_counter,
        "purchases": purchases,
        "purchase_items": purchase_items,
        "purchase_counter": purchase_counter,
        "purchase_debts": purchase_debts,
        "purchase_audit_log": [],
        "debt_payments": debt_payments,
        "expenses": expenses,
        "suppliers": suppliers,
        "exchange_rates": exchange_rates,
        "discarded_products": []
    },
    "stores": {
        "business": json.dumps({
            "name": business["name"],
            "type": business["type"],
            "phone": business["phone"],
            "address": business["address"],
            "logoUri": business["logo_path"]
        }, ensure_ascii=False),
        "settings": json.dumps({
            "baseCurrency": "IQD",
            "exchangeRate": EXCHANGE_RATE,
            "dollarPrice": 151000,
            "saleCheckoutModePreference": "standard",
            "expiryTrackingEnabled": True,
            "expiryAlertDays": 30,
            "thermalReceiptWidthPreference": "80mm"
        }, ensure_ascii=False),
        "quotations": "",
        "dashboardBanners": json.dumps({"banners": None, "bizBanners": None, "bannerVideo": None, "bizVideo": None})
    }
}

output_path = "data/backups/Froshiar_Complete_Test_Data_100_Items.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(backup_data, f, ensure_ascii=False, indent=2)

print(f"✅ Successfully generated {output_path}!")
print(f"  • Products: {len(products)}")
print(f"  • Categories: {len(categories)}")
print(f"  • Suppliers: {len(suppliers)}")
print(f"  • Customers: {len(customers)}")
print(f"  • Purchases (Batches): {len(purchases)}")
print(f"  • Sales Invoices: {len(sales)}")
print(f"  • Sale Items: {len(sale_items)}")
print(f"  • Customer Debts: {len(debts)}")
print(f"  • Supplier Debts: {len(purchase_debts)}")
print(f"  • Debt Payments: {len(debt_payments)}")
print(f"  • Expenses: {len(expenses)}")
