with open('scratch/build_ar_receipt_updater.py') as f:
    code = f.read()

# Replace the escaped newlines with raw string literals
code = code.replace(
    '("١. مەرجی پارەدان: ٥٠٪ پێشەکی لە کاتی ڕێککەوتن.\\n٢. گەیاندن: لە ماوەی ٣ ڕۆژی کارکردندا.", "1. Payment terms: 50% advance upon contract signing.\\n2. Delivery timeline: Within 3 business days."): "1. شروط الدفع: 50% دفعة مقدمة عند توقيع العقد.\\n2. مدة التوصيل: خلال 3 أيام عمل."',
    '(r"١. مەرجی پارەدان: ٥٠٪ پێشەکی لە کاتی ڕێککەوتن.\\n٢. گەیاندن: لە ماوەی ٣ ڕۆژی کارکردندا.", r"1. Payment terms: 50% advance upon contract signing.\\n2. Delivery timeline: Within 3 business days."): r"1. شروط الدفع: 50% دفعة مقدمة عند توقيع العقد.\\n2. مدة التوصيل: خلال 3 أيام عمل."'
)
code = code.replace(
    '("١. مەرجی پارەدان: ٥٠٪ پێشەکی لە کاتی ڕێککەوتن.\\n٢. گەیاندن: لە ماوەی ٣ ڕۆژی کارکردندا.", "1. Payment: 50% advance upon agreement.\\n2. Delivery: within 3 working days."): "1. شروط الدفع: 50% دفعة مقدمة عند الاتفاق.\\n2. التسليم: خلال 3 أيام عمل."',
    '(r"١. مەرجی پارەدان: ٥٠٪ پێشەکی لە کاتی ڕێککەوتن.\\n٢. گەیاندن: لە ماوەی ٣ ڕۆژی کارکردندا.", r"1. Payment: 50% advance upon agreement.\\n2. Delivery: within 3 working days."): r"1. شروط الدفع: 50% دفعة مقدمة عند الاتفاق.\\n2. التسليم: خلال 3 أيام عمل."'
)

with open('scratch/build_ar_receipt_updater.py', 'w') as f:
    f.write(code)

