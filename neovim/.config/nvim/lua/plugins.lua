return require("packer").startup(function()
  use {"wbthomason/packer.nvim", opt = true}

  use {
    "morhetz/gruvbox",
    config = function()
      vim.g.gruvbox_italic = false
      vim.g.gruvbox_invert_selection = false
      vim.cmd('colorscheme gruvbox')
    end
  }

  use {
    "folke/which-key.nvim",
    config = function()
      require("which-key").setup {
        plugins = {
          spelling = {
            enabled = true,
            suggestions = 20,
          },
        },
      }
    end
  }

  use {
    "nvim-treesitter/nvim-treesitter",
    cond = function()
      return vim.fn.executable("tree-sitter")
    end,
    run = ":TSUpdate",
    config = function()
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
          disable = { "c", "cpp" },
        },
        indent = {
          enable = false,
        },
      }
    end
  }
end)
