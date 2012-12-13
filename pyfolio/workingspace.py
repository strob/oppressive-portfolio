import os
import sys

imgdir = 'img'
datdir = 'json'

wwwdir = 'www'
devdir = 'dev'

def json2js(jsonfile, jsfile):
    open(jsfile, 'w').write("offload(%s);" % (open(jsonfile).read()))

def get_data(root, path):
    return os.path.join(root, 'data', path)

def setup(main_location):
    if hasattr(sys, 'frozen'):
        root = sys._MEIPASS
    else:
        root = os.path.abspath(os.path.dirname(main_location))
    
    # creates-if-necessary and returns the storage root.
    basedir = os.path.join(
        os.getenv('HOME') or '.',
        '.oppressive-portfolio')

    if not os.path.exists(basedir):
        os.makedirs(basedir)

    for dir in [datdir, imgdir, wwwdir, devdir]:
        subdir = os.path.join(basedir, dir)
        if not os.path.exists(subdir):
            os.makedirs(subdir)

    for dir in [wwwdir, devdir]:
        # symlink data files

        # XXX: maybe use os.walk to recurse? currently flat.
        commondir = get_data(root, 'common')
        for name in os.listdir(commondir):
            dest = os.path.join(basedir, dir, name)
            if not os.path.exists(dest):
                print 'creating dest', dest
                os.symlink(os.path.join(commondir, name), dest)
        datadir = get_data(root, dir)
        for name in os.listdir(datadir):
            dest = os.path.join(basedir, dir, name)
            if not os.path.exists(dest):
                os.symlink(os.path.join(datadir, name), dest)

        # link to common directories
        for cdir in [imgdir, datdir]:
            dest = os.path.join(basedir, dir, cdir)
            if not os.path.exists(dest):
                os.symlink(os.path.join(basedir, cdir), dest)

    return basedir
