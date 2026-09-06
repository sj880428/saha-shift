import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)

func savePNG(_ image: NSImage, to relativePath: String) throws {
    let target = root.appendingPathComponent(relativePath)
    try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
    guard let data = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: data),
          let png = bitmap.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "IconGenerator", code: 1)
    }
    try png.write(to: target)
}

func icon(size: Int, adaptiveForeground: Bool = false) -> NSImage {
    let canvas = NSImage(size: NSSize(width: size, height: size))
    canvas.lockFocus()

    let scale = CGFloat(size) / 1024
    let full = NSRect(x: 0, y: 0, width: size, height: size)
    if adaptiveForeground {
        NSColor.clear.setFill()
        full.fill()
    } else {
        NSColor(calibratedRed: 0.075, green: 0.475, blue: 0.357, alpha: 1).setFill()
        full.fill()
    }

    // Adaptive icons need extra breathing room because Android applies the final mask.
    let inset: CGFloat = adaptiveForeground ? 285 * scale : 174 * scale
    let card = NSRect(x: inset, y: inset * 0.82, width: CGFloat(size) - inset * 2, height: CGFloat(size) - inset * 1.68)
    let radius = (adaptiveForeground ? 64 : 72) * scale
    let cardPath = NSBezierPath(roundedRect: card, xRadius: radius, yRadius: radius)
    NSColor.white.setFill()
    cardPath.fill()

    let green = NSColor(calibratedRed: 0.075, green: 0.475, blue: 0.357, alpha: 1)
    let pale = NSColor(calibratedRed: 0.851, green: 0.949, blue: 0.910, alpha: 1)

    let ringWidth = (adaptiveForeground ? 24 : 34) * scale
    let ringY = card.maxY - (adaptiveForeground ? 30 : 42) * scale
    for x in [card.minX + card.width * 0.27, card.minX + card.width * 0.73] {
        let ring = NSBezierPath()
        ring.lineWidth = ringWidth
        ring.lineCapStyle = .round
        ring.move(to: NSPoint(x: x, y: ringY - 42 * scale))
        ring.line(to: NSPoint(x: x, y: ringY + 54 * scale))
        pale.setStroke()
        ring.stroke()
    }

    let divider = NSBezierPath()
    divider.lineWidth = (adaptiveForeground ? 20 : 30) * scale
    divider.move(to: NSPoint(x: card.minX, y: card.maxY - card.height * 0.31))
    divider.line(to: NSPoint(x: card.maxX, y: card.maxY - card.height * 0.31))
    green.setStroke()
    divider.stroke()

    let fontSize = (adaptiveForeground ? 94 : 142) * scale
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: fontSize, weight: .bold),
        .foregroundColor: green,
        .paragraphStyle: paragraph
    ]
    let textHeight = fontSize * 1.25
    let textRect = NSRect(x: card.minX, y: card.minY + card.height * 0.12, width: card.width, height: textHeight)
    ("사하" as NSString).draw(in: textRect, withAttributes: attributes)

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

let androidSizes: [(String, Int)] = [
    ("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)
]
for (density, size) in androidSizes {
    try savePNG(icon(size: size), to: "android/app/src/main/res/mipmap-\(density)/ic_launcher.png")
    try savePNG(icon(size: size), to: "android/app/src/main/res/mipmap-\(density)/ic_launcher_round.png")
    try savePNG(icon(size: size, adaptiveForeground: true), to: "android/app/src/main/res/mipmap-\(density)/ic_launcher_foreground.png")
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
