# M2 T5 S1 P13 PCjs Change Report: Native Text Framebuffer

PCjs separates video hardware state from browser presentation. Original
TypeScript now applies the same boundary: project-native VGA state is projected
into text cells and the browser canvas consumes that projection. No PCjs source
or runtime is imported.
