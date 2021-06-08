require('nvim-treesitter.configs').setup {
  ensure_installed = "maintained",
  ignore_install = { "json" },
  highlight = {
    enable = true,
    custom_captures = {
      ["punctuation.bracket"] = "",
      ["punctuation.delimiter"] = "",
      ["operator"] = "",
    },
    disable = { "c", "cpp", "bash" },
  },
  indent = {
    enable = false,
  },
}

if vim.version()["minor"] >= 5 then
  require('which-key').setup {
    plugins = {
      spelling = {
        enabled = true,
        suggestions = 20,
      },
    },
  }
end
