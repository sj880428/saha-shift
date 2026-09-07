import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let sourceURL = root.appendingPathComponent("assets/app-icon-final.png")

guard let sourceIcon = NSImage(contentsOf: sourceURL) else {
    fatalError("Could not load assets/app-icon-final.png")
}

func savePNG(_ image: NSImage, to relativePath: String, opaque: Bool = true) throws {
    let target = root.appendingPathComponent(relativePath)
    try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
    let width = Int(image.size.width)
    let height = Int(image.size.height)
    var proposedRect = NSRect(origin: .zero, size: image.size)
    let alphaInfo: CGImageAlphaInfo = opaque ? .noneSkipLast : .premultipliedLast
    guard let source = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil),
          let context = CGContext(
              data: nil,
              width: width,
              height: height,
              bitsPerComponent: 8,
              bytesPerRow: width * 4,
              space: CGColorSpaceCreateDeviceRGB(),
              bitmapInfo: alphaInfo.rawValue
          ) else {
        throw NSError(domain: "IconGenerator", code: 1)
    }
    context.interpolationQuality = .high
    context.draw(source, in: CGRect(x: 0, y: 0, width: width, height: height))
    guard let rendered = context.makeImage() else {
        throw NSError(domain: "IconGenerator", code: 2)
    }
    let bitmap = NSBitmapImageRep(cgImage: rendered)
    guard let png = bitmap.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "IconGenerator", code: 3)
    }
    try png.write(to: target)
}

func icon(size: Int, adaptiveForeground: Bool = false) -> NSImage {
    let canvas = NSImage(size: NSSize(width: size, height: size))
    canvas.lockFocus()

    let full = NSRect(x: 0, y: 0, width: size, height: size)
    if adaptiveForeground {
        NSColor.clear.setFill()
        full.fill()
        // Android applies its own circle/squircle mask. Keep the artwork inside
        // the adaptive-icon safe zone and let the cream background blend out.
        let inset = CGFloat(size) * 0.14
        sourceIcon.draw(
            in: full.insetBy(dx: inset, dy: inset),
            from: NSRect(origin: .zero, size: sourceIcon.size),
            operation: .sourceOver,
            fraction: 1
        )
    } else {
        sourceIcon.draw(
            in: full,
            from: NSRect(origin: .zero, size: sourceIcon.size),
            operation: .sourceOver,
            fraction: 1
        )
    }

    canvas.unlockFocus()
    return canvas
}

func splash(width: Int, height: Int) -> NSImage {
    let canvas = NSImage(size: NSSize(width: width, height: height))
    canvas.lockFocus()

    let full = NSRect(x: 0, y: 0, width: width, height: height)
    NSColor.white.setFill()
    full.fill()

    let shortestSide = CGFloat(min(width, height))
    let iconSize = min(shortestSide * 0.28, CGFloat(width) * 0.42)
    let centerX = CGFloat(width) / 2
    let centerY = CGFloat(height) / 2
    let iconRect = NSRect(
        x: centerX - iconSize / 2,
        y: centerY - iconSize * 0.25,
        width: iconSize,
        height: iconSize
    )
    let clippingPath = NSBezierPath(
        roundedRect: iconRect,
        xRadius: iconSize * 0.22,
        yRadius: iconSize * 0.22
    )
    NSGraphicsContext.saveGraphicsState()
    clippingPath.addClip()
    icon(size: 1024).draw(in: iconRect)
    NSGraphicsContext.restoreGraphicsState()

    let titleSize = max(18, shortestSide * 0.042)
    let subtitleSize = max(11, shortestSide * 0.022)
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    let titleAttributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: titleSize, weight: .bold),
        .foregroundColor: NSColor(calibratedRed: 0.10, green: 0.14, blue: 0.23, alpha: 1),
        .paragraphStyle: paragraph
    ]
    let subtitleAttributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: subtitleSize, weight: .medium),
        .foregroundColor: NSColor(calibratedRed: 0.40, green: 0.46, blue: 0.56, alpha: 1),
        .paragraphStyle: paragraph
    ]
    let titleY = iconRect.minY - titleSize * 1.65
    ("사하의집 근무계획" as NSString).draw(
        in: NSRect(x: 0, y: titleY, width: CGFloat(width), height: titleSize * 1.4),
        withAttributes: titleAttributes
    )
    ("근무표를 불러오는 중" as NSString).draw(
        in: NSRect(x: 0, y: titleY - subtitleSize * 1.7, width: CGFloat(width), height: subtitleSize * 1.4),
        withAttributes: subtitleAttributes
    )

    canvas.unlockFocus()
    return canvas
}

try savePNG(icon(size: 1024), to: "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
try savePNG(icon(size: 1024), to: "app-icon.png")

let androidSizes: [(String, Int, Int)] = [
    ("mdpi", 48, 108),
    ("hdpi", 72, 162),
    ("xhdpi", 96, 216),
    ("xxhdpi", 144, 324),
    ("xxxhdpi", 192, 432)
]
for (density, size, adaptiveSize) in androidSizes {
    try savePNG(icon(size: size), to: "android/app/src/main/res/mipmap-\(density)/ic_launcher.png")
    try savePNG(icon(size: size), to: "android/app/src/main/res/mipmap-\(density)/ic_launcher_round.png")
    try savePNG(icon(size: adaptiveSize, adaptiveForeground: true), to: "android/app/src/main/res/mipmap-\(density)/ic_launcher_foreground.png", opaque: false)
}

let androidSplashSizes: [(String, Int, Int)] = [
    ("drawable", 480, 320),
    ("drawable-port-mdpi", 320, 480),
    ("drawable-port-hdpi", 480, 800),
    ("drawable-port-xhdpi", 720, 1280),
    ("drawable-port-xxhdpi", 960, 1600),
    ("drawable-port-xxxhdpi", 1280, 1920),
    ("drawable-land-mdpi", 480, 320),
    ("drawable-land-hdpi", 800, 480),
    ("drawable-land-xhdpi", 1280, 720),
    ("drawable-land-xxhdpi", 1600, 960),
    ("drawable-land-xxxhdpi", 1920, 1280)
]
for (folder, width, height) in androidSplashSizes {
    try savePNG(splash(width: width, height: height), to: "android/app/src/main/res/\(folder)/splash.png")
}

let iosSplash = splash(width: 2732, height: 2732)
for filename in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"] {
    try savePNG(iosSplash, to: "ios/App/App/Assets.xcassets/Splash.imageset/\(filename)")
}

print("Generated iOS and Android app icons and launch screens.")
