import AppKit

func renderBlackSplash(svgPath: String, width: Int, height: Int, logoScale: CGFloat, outPath: String) {
    let svgUrl = URL(fileURLWithPath: svgPath)
    guard let svgImage = NSImage(contentsOf: svgUrl) else {
        print("Failed to load SVG at \(svgPath)")
        return
    }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue
    guard let ctx = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: bitmapInfo
    ) else {
        print("Failed to create CGContext")
        return
    }

    // Pure solid black background
    ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1.0))
    ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

    // Calculate logo size centered
    let svgW = svgImage.size.width
    let svgH = svgImage.size.height
    let targetW = CGFloat(width) * logoScale
    let targetH = targetW * (svgH / svgW)

    let targetX = (CGFloat(width) - targetW) / 2.0
    let targetY = (CGFloat(height) - targetH) / 2.0
    let logoRect = CGRect(x: targetX, y: targetY, width: targetW, height: targetH)

    let graphicsContext = NSGraphicsContext(cgContext: ctx, flipped: false)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = graphicsContext

    svgImage.draw(in: logoRect, from: .zero, operation: .sourceOver, fraction: 1.0)

    NSGraphicsContext.restoreGraphicsState()

    guard let cgImage = ctx.makeImage() else {
        print("Failed to make CGImage")
        return
    }

    let rep = NSBitmapImageRep(cgImage: cgImage)
    guard let pngData = rep.representation(using: .png, properties: [:]) else {
        print("Failed to convert to PNG")
        return
    }

    try? pngData.write(to: URL(fileURLWithPath: outPath))
    print("Wrote \(outPath) (\(width)x\(height))")
}

// 1x: 414 x 736 (standard iOS splash)
renderBlackSplash(svgPath: "assets/illustrations/11111111111111.svg", width: 414, height: 736, logoScale: 0.38, outPath: "scratch/splash_1x.png")

// 2x: 828 x 1472
renderBlackSplash(svgPath: "assets/illustrations/11111111111111.svg", width: 828, height: 1472, logoScale: 0.38, outPath: "scratch/splash_2x.png")

// 3x: 1242 x 2208
renderBlackSplash(svgPath: "assets/illustrations/11111111111111.svg", width: 1242, height: 2208, logoScale: 0.38, outPath: "scratch/splash_3x.png")

// Square 1024x1024 logo on transparent
func renderTransparentLogo(svgPath: String, size: Int, outPath: String) {
    let svgUrl = URL(fileURLWithPath: svgPath)
    guard let svgImage = NSImage(contentsOf: svgUrl) else { return }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue
    guard let ctx = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: size * 4,
        space: colorSpace,
        bitmapInfo: bitmapInfo
    ) else { return }

    ctx.clear(CGRect(x: 0, y: 0, width: size, height: size))

    let svgW = svgImage.size.width
    let svgH = svgImage.size.height
    let maxDim = CGFloat(size) * 0.8
    let targetH = maxDim
    let targetW = targetH * (svgW / svgH)

    let targetX = (CGFloat(size) - targetW) / 2.0
    let targetY = (CGFloat(size) - targetH) / 2.0
    let logoRect = CGRect(x: targetX, y: targetY, width: targetW, height: targetH)

    let graphicsContext = NSGraphicsContext(cgContext: ctx, flipped: false)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = graphicsContext

    svgImage.draw(in: logoRect, from: .zero, operation: .sourceOver, fraction: 1.0)

    NSGraphicsContext.restoreGraphicsState()

    guard let cgImage = ctx.makeImage() else { return }
    let rep = NSBitmapImageRep(cgImage: cgImage)
    guard let pngData = rep.representation(using: .png, properties: [:]) else { return }
    try? pngData.write(to: URL(fileURLWithPath: outPath))
    print("Wrote \(outPath) (\(size)x\(size))")
}

renderTransparentLogo(svgPath: "assets/illustrations/11111111111111.svg", size: 1024, outPath: "scratch/froshiar_gold_logo_1024.png")
