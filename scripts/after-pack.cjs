const path = require('path');

/** Patch Notes.exe icon and metadata when signAndEditExecutable is disabled. */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const { rcedit } = await import('rcedit');
  const projectDir = context.packager.info.projectDir;
  const productName = context.packager.appInfo.productFilename;
  const exePath = path.join(context.appOutDir, `${productName}.exe`);
  const iconPath = path.join(projectDir, 'build', 'icon.ico');
  const version = context.packager.appInfo.version;

  await rcedit(exePath, {
    icon: iconPath,
    'product-version': version,
    'file-version': version,
    'version-string': {
      CompanyName: 'Kawaza',
      FileDescription: 'Notes',
      ProductName: 'Notes',
      InternalName: 'Notes',
      OriginalFilename: `${productName}.exe`,
    },
  });

  console.log('Patched Windows executable icon and metadata:', exePath);
};
