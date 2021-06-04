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
end)
