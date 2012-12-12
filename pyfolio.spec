# -*- mode: python -*-
a = Analysis(['/Users/RMO/src/oppressive-portfolio/pyfolio/main.py'],
             pathex=['/Users/RMO/src/found/pyinstaller'],
             hiddenimports=[],
             hookspath=None)
pyz = PYZ(a.pure)
exe = EXE(pyz,
          a.scripts,
          exclude_binaries=1,
          name=os.path.join('build/pyi.darwin/main', 'main'),
          debug=False,
          strip=None,
          upx=True,
          console=False )

extradata = []
for dirpath, dirnames, filenames in os.walk('/Users/RMO/src/oppressive-portfolio/pyfolio/data'):
    for filename in filenames:
        extradata.append((os.path.join('data', dirpath.split(os.sep)[-1], filename),
                          os.path.join(dirpath, filename),
                          'DATA'))

coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas + extradata,
               strip=None,
               upx=True,
               name=os.path.join('dist', 'main'))
app = BUNDLE(coll,
             name=os.path.join('dist', 'PyFolio.app'))
