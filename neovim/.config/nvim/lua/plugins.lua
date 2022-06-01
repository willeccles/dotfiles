local fn = vim.fn
local cmd = vim.cmd

local install_path = fn.stdpath('data')..'/site/pack/packer/opt/packer.nvim'
if fn.empty(fn.glob(install_path)) > 0 then
  packer_bootstrap = fn.system({'git', 'clone', '--depth', '1',
      'https://github.com/wbthomason/packer.nvim', install_path})
end

cmd 'packadd packer.nvim'
cmd 'autocmd BufWritePost plugins.lua PackerCompile'

return require("packer").startup({function(use)
  use { "wbthomason/packer.nvim", opt = true }

  use {
    "willeccles/gruvbox",
    config = function()
      vim.g.gruvbox_italic = false
      vim.g.gruvbox_invert_selection = false
      vim.cmd('colorscheme gruvbox')

      --default status line colors which have to be specified because this is
      --compared with StatusLineNC when falling back to that
      vim.cmd [[highlight StatusLine guibg=#3c3836 guifg=#ebdbb2]]
      --non-focused status line colors to fall back to when User1..2 aren't used
      vim.cmd [[highlight StatusLineNC guibg=#32302f guifg=#bdae93]]

      --use these with %1* and %2*
      vim.cmd [[highlight User1 guibg=#3c3836 guifg=#928374]]
      vim.cmd [[highlight User2 guibg=#3c3836 guifg=#ebdbb2]]
    end
  }

  --[[
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
  ]]

  --[[
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
  --]]

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

  --[[
  use {
    "nvim-telescope/telescope.nvim",
    requires = {
      'nvim-lua/popup.nvim',
      'nvim-lua/plenary.nvim',
    },
  }
  ]]

  use { "adelarsq/vim-matchit" }

  --[[
  use {
    "dense-analysis/ale",
    config = function()
      vim.g.ale_completion_enabled = 1
      --vim.g.ale_pattern_options = { '\.h$': {'ale_linters': ['clangd', 'ccls', 'clang', 'clangcheck', 'clangtidy', 'clazy', 'cppcheck', 'cpplint', 'cquery', 'flawfinder', 'gcc'] } }
      vim.g.ale_c_cc_options = '-Wall -pedantic -std=c11 -D_DEFAULT_SOURCE -D_XOPEN_SOURCE=700'
      vim.g.ale_cpp_cc_options = '-Wall -pedantic -std=c++20 -D_DEFAULT_SOURCE -D_XOPEN_SOURCE=700'
      vim.g.ale_c_parse_compile_commands = 1
      vim.g.ale_cpp_parse_compile_commands = 1
      vim.g.ale_hover_cursor = 0
      vim.g.ale_cursor_detail = 0
      -- since LSP sucks, these options are useless with completion enabled
      vim.g.ale_lint_on_text_changed = 0
      vim.g.ale_lint_on_insert_leave = 0
      vim.g.ale_lint_on_save = 1
    end,
  }
  ]]

  use { "godlygeek/tabular" }

  if packer_bootstrap then
    require('packer').sync()
  end
end,
config = {
  display = {
    open_fn = require('packer.util').float,
  }
}})
