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
    let inset: CGFloat = adaptiveForeground ? 230 * scale : 174 * scale
    let card = NSRect(x: inset, y: inset * 0.82, width: CGFloat(size) - inset * 2, height: CGFloat(size) - inset * 1.68)
    let radius = (adaptiveForeground ? 64 : 72) * scale
    let cardPath = NSBezierPath(roundedRect: card, xRadius: radius, yRadius: radius)
    NSColor.white.setFill()
    cardPath.fill()

    let green = NSColor(calibratedRed: 0.075, green: 0.475, blue: 0.357, alpha: 1)
    let pale = NSColor(calibratedRed: 0.851, green: 0.949, blue: 0.910, alpha: 1)

    let ringWidth = (adaptiveForeground ? 28 : 34) * scale
    let ringY = card.maxY - (adaptiveForeground ? 34 : 42) * scale
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
    divider.lineWidth = (adaptiveForeground ? 24 : 30) * scale
    divider.move(to: NSPoint(x: card.minX, y: card.maxY - card.height * 0.31))
    divider.line(to: NSPoint(x: card.maxX, y: card.maxY - card.height * 0.31))
    green.setStroke()
    divider.stroke()

    let fontSize = (adaptiveForeground ? 112 : 142) * scale
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

try savePNG(icon(size: 1024), to: "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")

let androidSizes: [(String, Int)] = [
    ("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)
]
for (density, size) in androidSizes {
    try savePNG(icon(size: size), to: "android/app/src/main/res/mipmap-\(density)/ic_launcher.png")
    try savePNG(icon(size: size), to: "android/app/src/main/res/mipmap-\(density)/ic_launcher_round.png")
    try savePNG(icon(size: size, adaptiveForeground: true), to: "android/app/src/main/res/mipmap-\(density)/ic_launcher_foreground.png")
}

print("Generated iOS and Android app icons.")
