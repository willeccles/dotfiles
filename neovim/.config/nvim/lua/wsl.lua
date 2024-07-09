local clip = "/mnt/c/Windows/System32/clip.exe"
local pwsh = "/mnt/c/Windows/System32/WindowsPowershell/v1.0/powershell.exe"
local pwsh_args = ' -c [Console]::Out.Write($(Get-Clipboard -Raw).tostring().replace("`r", ""))'

vim.g.clipboard = {
  name = "WslClipboard",
  copy = {
    ["+"] = clip,
    ["*"] = clip,
  },
  paste = {
    ["+"] = pwsh .. pwsh_args,
    ["*"] = pwsh .. pwsh_args,
  },
  cache_enabled = false,
}
