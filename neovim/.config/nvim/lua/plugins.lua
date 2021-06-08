return require("packer").startup(function()
  use { "wbthomason/packer.nvim", opt = true }

  use {
    "willeccles/gruvbox",
    config = function()
      vim.g.gruvbox_italic = false
      vim.g.gruvbox_invert_selection = false
      vim.cmd('colorscheme gruvbox')

      --default status line colors which have to be specified because this is compared
      --with StatusLineNC when falling back to that
      vim.cmd [[highlight StatusLine guibg=#3c3836 guifg=#ebdbb2]]
      --non-focused status line colors to fall back to when User1..2 aren't used
      vim.cmd [[highlight StatusLineNC guibg=#32302f guifg=#bdae93]]

      --use these with %1* and %2*
      vim.cmd [[highlight User1 guibg=#3c3836 guifg=#928374]]
      vim.cmd [[highlight User2 guibg=#3c3836 guifg=#ebdbb2]]
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
          disable = { "c", "cpp", "bash" },
        },
        indent = {
          enable = false,
        },
      }
    end
  }

  use {
    "lewis6991/gitsigns.nvim",
    cond = function()
      return vim.fn.executable('git')
    end,
    requires = { "nvim-lua/plenary.nvim" },
    config = function()
      require('gitsigns').setup {
        signs = {
          add          = { hl = 'GruvboxGreenSign', text = '+' },
          change       = { hl = 'GruvboxAquaSign', text = '~' },
          delete       = { hl = 'GruvboxRedSign', text = '_' },
          topdelete    = { hl = 'GruvboxRedSign', text = '‾' },
          changedelete = { hl = 'GruvboxAquaSign', text = '~' },
        },
        numhl = false,
        linehl = false,
      }
    end
  }

  use {
    "nvim-telescope/telescope.nvim",
    requires = {
      'nvim-lua/popup.nvim',
      'nvim-lua/plenary.nvim',
    },
  }
end)
