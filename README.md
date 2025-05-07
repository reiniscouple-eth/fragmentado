# Fragmentado - Interactive Image Deconstruction

**By:** Reiniscouple

## Description

Fragmentado is an interactive digital art piece where users can "deconstruct" an image by simply moving their mouse or finger over it. The image appears to fragment, smear, and break apart under the user's touch, creating a unique, ephemeral visual experience. 

The artwork dynamically selects an image based on the screen's orientation (landscape or portrait) at load time and displays it fullscreen for an immersive interaction. Users can reset the deconstruction or download their unique creation.

## Features

* **Interactive Deconstruction:** Drag your mouse or swipe your finger across the image to apply a "smearing" or "fragmentation" effect.
* **Dynamic Image Loading:** Automatically loads a landscape-oriented image (`assets/image_a.jpg`) or a portrait-oriented image (`assets/image_b.jpg`) based on the screen's orientation when the page loads.
* **Fullscreen Display:** The artwork utilizes the full browser window for an immersive experience.
* **Reset Functionality:** A dedicated icon button (circular arrow) allows you to instantly reset the image to its original, pristine state.
* **Download Artwork:** An icon button (downward arrow) lets you download your unique, deconstructed version of the image as a `.png` file, timestamped for uniqueness.
* **Simple Interface:** Minimalist controls and a persistent footer displaying the artwork's title and author.

## How to Run / Setup

This project is built using [p5.js](https://p5js.org/).

1.  **Download or Clone:**
    * Clone this repository
    * Or download the project files as a ZIP.

2.  **File Structure:**
    Ensure you have the following file structure, with your images in the `assets` folder:
    ```
    your_project_directory/
    ├── index.html        (Or your main HTML file, e.g., fragmentado.html)
    └── assets/
        ├── image_a.jpg   (Your image for landscape orientation)
        └── image_b.jpg   (Your image for portrait orientation)
    ```
    * Make sure to replace `image_a.jpg` and `image_b.jpg` in the `assets` folder with your actual image files.

3.  **Open in Browser:**
    * Simply open the `index.html` (or your main HTML file) in a modern web browser (like Chrome, Firefox, Safari, Edge).
    * For the most reliable experience, especially regarding local asset loading, it's good practice to run it through a local web server. However, for simple p5.js sketches like this one using local assets, opening the HTML file directly from your file system (`file:///...`) usually works fine in most modern browsers.

## How to Interact

* **Deconstruct:** Click and drag your mouse cursor over the image. On touch-enabled devices, swipe your finger across the image.
* **Reset:** Click the **reload icon** (circular arrow), typically located at the top-right corner, to revert the image to its original state.
* **Download:** Click the **download icon** (downward arrow), typically located below the reset button, to save the current state of your deconstructed image as a PNG file. The filename will include a timestamp.

## Technology Used

* **[p5.js](https://p5js.org/):** A JavaScript library for creative coding, making it easy to work with graphics, interactivity, and media.

## License

This project is licensed under the **MIT License**.

Please see the `LICENSE.md` file in this repository for the full license text.

---

Created with interactive art exploration in mind by Reiniscouple.
