const colors = require('tailwindcss/colors')

/** @type {import("tailwindcss").Config} */ 
module.exports = {
    content: ["./src/**/*\.{html,css,js,ts,svelte}"],
    theme: {
      extend: {
        colors: {
          backdrop: "#f0eedf",
          block: "#f0eedf",
          title: colors.indigo[400],
          text: colors.black,
          "button-text": colors.black,
          icon: colors.black,
          menu: "#f0eedf",
          "menu-text": colors.black,
          button: "#f0eedf",
          hover: "#f0eedf"
        }
      }
    },
    variants: {
      extend: {}
    },
    plugins: [
      require("@tailwindcss/forms")
    ]
}
