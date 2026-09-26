# ============================================================
#  ProLink — servidor local (reserva, sem depender de Python/PHP)
#  ------------------------------------------------------------
#  O navegador bloqueia a leitura de arquivos locais quando a
#  página é aberta com duplo clique (endereço file://). Este
#  script publica a pasta em http://localhost e abre o app.
#  Para encerrar, feche esta janela ou aperte Ctrl+C.
# ============================================================

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Definition
$listener = New-Object System.Net.HttpListener
$porta = 0

foreach ($tentativa in 8000..8010) {
    try {
        $listener.Prefixes.Clear()
        $listener.Prefixes.Add("http://localhost:$tentativa/")
        $listener.Start()
        $porta = $tentativa
        break
    } catch {
        # Porta ocupada: tenta a próxima.
    }
}

if ($porta -eq 0) {
    Write-Host "Não consegui abrir nenhuma porta entre 8000 e 8010." -ForegroundColor Red
    Read-Host "Aperte Enter para fechar"
    exit 1
}

$tipos = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".txt"  = "text/plain; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

Write-Host ""
Write-Host "  ProLink rodando em http://localhost:$porta" -ForegroundColor Green
Write-Host "  Feche esta janela para encerrar." -ForegroundColor DarkGray
Write-Host ""

Start-Process "http://localhost:$porta/index.html"

while ($listener.IsListening) {
    try {
        $contexto = $listener.GetContext()
    } catch {
        break
    }

    $relativo = [Uri]::UnescapeDataString($contexto.Request.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($relativo)) { $relativo = "index.html" }

    $caminho = Join-Path $raiz $relativo
    $dentroDaPasta = $false
    try {
        $completo = [System.IO.Path]::GetFullPath($caminho)
        $dentroDaPasta = $completo.StartsWith([System.IO.Path]::GetFullPath($raiz))
    } catch {
        $dentroDaPasta = $false
    }

    if ($dentroDaPasta -and (Test-Path $caminho -PathType Leaf)) {
        $bytes = [System.IO.File]::ReadAllBytes($caminho)
        $extensao = [System.IO.Path]::GetExtension($caminho).ToLower()
        if ($tipos.ContainsKey($extensao)) {
            $contexto.Response.ContentType = $tipos[$extensao]
        } else {
            $contexto.Response.ContentType = "application/octet-stream"
        }
        $contexto.Response.ContentLength64 = $bytes.Length
        $contexto.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $contexto.Response.StatusCode = 404
    }

    $contexto.Response.OutputStream.Close()
}
