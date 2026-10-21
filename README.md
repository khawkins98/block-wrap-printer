# Block Wrap Printer

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
  overlap guides, fold marks and wrap tabs.
- Starts the PDF with a guide page that explains printing and assembly.

Print at 100% (turn off "fit to page"). Check the scale line on the first sheet
before you print the rest.

## Running it

Open `index.html` in a browser. That's it. There's no build step, and the PDF is
made in your browser with [jsPDF](https://github.com/parallax/jsPDF).

It's also set up for GitHub Pages: deploy from the `main` branch, root folder.

## License

The code is under the MIT License; see `LICENSE`. The Minecraft textures in
`assets/source/` (and embedded in `index.html`) are not covered by it. They
belong to Mojang and are here for personal fan use. This isn't an official
Minecraft product and isn't approved by or associated with Mojang or Microsoft.
