from PyQt4 import QtGui
from PyQt4 import QtCore
from PyQt4 import QtWebKit

import base64
import sys
import Image
import os
from StringIO import StringIO
import subprocess
import tempfile
import glob

import ftpsync

from oppapp.bridge import OppressiveBridge
import pyfolio.workingspace as workingspace

FTP_ROUTE = "ftp://user:pass@domain/path"

basedir = workingspace.setup(__file__)
imgdir = os.path.join(basedir, workingspace.imgdir)
devdir = os.path.join(basedir, workingspace.devdir)

class FolioBridge(OppressiveBridge):
    @QtCore.pyqtSlot(str, str, result=str)
    def upload(self, name, b64):
        name, b64 = str(name), str(b64)
        print 'got uploaded file', len(b64)

        # skip the MIME-type & hope PIL figures it out
        b64 = b64[b64.index(',')+1:]

        payload = StringIO(base64.decodestring(b64))
        # scale right off the bat...
        im = Image.open(payload)

        # resize to max 1600x
        aspect = im.size[0] / float(im.size[1])
        im = im.convert("RGB").resize((1600, int(1600/aspect)), Image.ANTIALIAS)

        im.save(os.path.join(imgdir, name + '.jpg'))

        if hasattr(self, 'window'):
            self.window.scale_images()

        return name + '.jpg'

app = QtGui.QApplication(sys.argv)
app.setApplicationName('folio')

class FolioWindow(QtGui.QMainWindow):
    def __init__(self):
        QtGui.QMainWindow.__init__(self)

        self.load()

        menubar = self.menuBar()
        menu = menubar.addMenu('&things-to-do')
        
        entry = menu.addAction("preview")
        self.connect(entry,QtCore.SIGNAL('triggered()'), lambda: self.preview())
        refresh = menu.addAction("refresh")
        self.connect(refresh,QtCore.SIGNAL('triggered()'), lambda: self.reload())
        upload = menu.addAction("upload")
        self.connect(upload,QtCore.SIGNAL('triggered()'), lambda: self.upload())

    def load(self):
        web = QtWebKit.QWebView()
        web.settings().setAttribute(QtWebKit.QWebSettings.DeveloperExtrasEnabled, True)
        web.load(QtCore.QUrl("file://" + os.path.join(devdir, 'index.html')))
        web.show()
        self.web = web

        self.setCentralWidget(web)
        self.web.loadFinished.connect(self.bridge)
        self.bridge = FolioBridge(basepath=os.path.join(basedir, 'json'), types=("Link", "Image", "Project", "Projects", "Text"))
        self.bridge.window = self

    def bridge(self, is_ok):
        self.bridge.inject(self.web)

    def reload(self):
        self.web.reload()

    def make_static(self):
        # copy over the offline version to a temporary directory
        self.scale_images()
        tdir = tempfile.mkdtemp()
        cmd = ['rsync', '-aL', 
               "%s/.oppressive-portfolio/www/" % (os.environ['HOME']),
               tdir + '/']
        p = subprocess.Popen(cmd)
        p.wait()

        for jsonfile in glob.glob(os.path.join(tdir, 'json', '*.json')):
            workingspace.json2js(jsonfile, os.path.join(tdir, os.path.basename(jsonfile).replace('.json', '.js')))

        return tdir

    def scale_images(self, quality=75):
        for dirname, W in [['sm', 800], ['big', 1200]]:
            subdir=os.path.join(imgdir, dirname)
            if not os.path.exists(subdir):
                os.makedirs(subdir)
            for impath in glob.glob(os.path.join(imgdir, '*.jpg')):
                smpath = os.path.join(subdir, os.path.basename(impath))
                if not os.path.exists(smpath):
                    print 'sm', smpath
                    im = Image.open(impath)
                    aspect = im.size[0] / float(im.size[1])
                    im = im.resize((W, int(W/aspect)), Image.ANTIALIAS)
                    im.save(smpath, quality=quality)

    def upload(self):
        tdir = self.make_static()

        session = ftpsync.FtpSession(FTP_ROUTE)
        local_files = ftpsync.get_local_files(tdir)
        remote_files = session.get_files(update_listing=True)

        download_list, upload_list, new_upload_list = ftpsync.compute_task(local_files, remote_files)

        for filename in upload_list:
            source = os.path.join(tdir, filename)
            status = session.upload(filename, source, mk_backup=True)
            print 'upload', filename

        for filename in new_upload_list:
            source = os.path.join(tdir, filename)
            status = session.upload(filename, source, mk_backup=False)
            print 'new upload', filename

        self.show_website('http://grabuschnigg.com/')

    def preview(self):
        tdir = self.make_static()

        filepath = os.path.join(tdir, 'index.html')
        self.show_website(filepath)

    def show_website(self, filepath):
        if sys.platform.startswith('darwin'):
            subprocess.call(('open', filepath))
        elif os.name == 'nt':
            os.startfile(filepath)
        elif os.name == 'posix':
            subprocess.call(('xdg-open', filepath))


mw = FolioWindow()
mw.show()

if sys.platform == "darwin":
   mw.raise_()

if __name__=='__main__':
    sys.exit(app.exec_())
