# Block Wrap Printer

**Use it here: https://khawkins98.github.io/block-wrap-printer/**

My son really wanted a homemade Wither head for his Halloween costume. We had a
cardboard box that was about the right size. The hard part was getting the
Minecraft texture printed at the right scale, split across sheets of paper, and
lined up so it actually wrapped the box.

Then he wanted to turn another box into a grass block. That box wasn't a cube,
and I couldn't find a good way to do any of this.

So I built one, with a lot of help from AI and some general coding knowledge.
It's a single web page. You give it a texture and the size of your box, and it
gives you a PDF you can print, cut out and glue on.

Hopefully somebody else finds it useful.

## What it does

- Reads a Minecraft skin (it uses the head), an unfolded block texture, or a
  single square tile. Wither, grass and dirt are built in.
- Works for cubes and for boxes of any size. For boxes that aren't cubes, you
  pick which side is the top. The texture can be stretched to fit, repeated, or
  repeated with mirroring.
- Splits each face across A3, A4, US Letter or Tabloid paper. Each sheet has
  matching seam marks, fold marks and wrap tabs.
- Offers a separate test sheet with a 100 × 100 mm calibration square and
  practice seam pieces using your planned overlap.
- Starts the PDF with a guide page that explains printing and assembly.

Print at 100% (turn off "fit to page"). Use **Print a test sheet** first and check
both dimensions of the calibration square before printing the panels.

Follow the PDF guide when joining sheets: assemble horizontal rows first, then
join the rows. Keep the paper gutters until you have aligned the matching seam
marks. Cutting through the earlier sheet's crosses exposes half of each mark so
you can align it with the next sheet underneath; this leaves half the labeled
overlap for taping or gluing. Trim the outside borders after assembly.

## Running it

Open `index.html` in a browser. That's it. There's no build step, and the PDF is
made in your browser with [jsPDF](https://github.com/parallax/jsPDF).

It's also set up for GitHub Pages: deploy from the `main` branch, root folder.

## License

The code is under the MIT License; see `LICENSE`. The Minecraft textures in
`assets/source/` (and embedded in `index.html`) are not covered by it. They
belong to Mojang and are here for personal fan use. This isn't an official
Minecraft product and isn't approved by or associated with Mojang or Microsoft.
