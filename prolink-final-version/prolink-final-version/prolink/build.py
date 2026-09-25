"""
Gera as páginas HTML (as views do ProLink) e empacota a base inicial.

Os templates ficam em app/views/paginas.py; este arquivo só o executa,
para o comando continuar sendo: python build.py
"""
import os
import runpy

runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "views", "paginas.py"), run_name="__main__")
