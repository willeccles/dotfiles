require'nvim-treesitter.configs'.setup {
  ensure_installed = "maintained",
  ignore_install = { "json" },
  highlight = {
    enable = true,
    custom_captures = {
      ["punctuation.bracket"] = "",
      ["punctuation.delimiter"] = "",
      ["operator"] = "",
    },
  },
  indent = {
    enable = false,
  },
}
