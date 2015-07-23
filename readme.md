Theme Tool
==========

[![Join the chat at https://gitter.im/meeech/Shopify-Theme-Tool](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/meeech/Shopify-Theme-Tool?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

TT lets you add your shop, download your themes. TT will upload any changes and upload it to your shop.

Building
--------

**Requirements**

* OSX (10.8 - your mileage may vary with older versions)
* [TideSDK](http://www.tidesdk.org)
* Default Ruby 1.8.7 which ships with OSX (/usr/bin/ruby) [note: things seem to be working fine with 2.0.X that now ships with 10.9]

**Getting started**

Packaging up the app. This will create a .app, which you can then zip up for distribution:

`tidebuilder.py -i "dist,packages" -n -t bundle -d /path/to/build/to /path/to/app/source`
(tidebuilder.py should be in your `~/Library/Application Support/TideSDK/sdk/osx/[version]`)

Building on OSX still does not recognize `.help` files, so you'll have to make the app aware of the help book. So, once you've built the .app, right click on it and `Show Package Contents`. In the `Contents` folder, open `Info.plist` in your favourite text editor. `Info.plist` is a XML file. Under `plist > dict` you will want to add:

    <key>CFBundleHelpBookFolder</key>
    <string>ShopifyTheme.help</string>
    <key>CFBundleHelpBookName</key>
    <string>com.meeech.shopify_theme2.help</string>

To zip up the .app:

`zip -ry NameOfZip.zip AppName.app`

**Development Setup**

You'll need the TideSDK Developer tool which assists you to create, run and package your apps during development. You can grab this from [TideSDK.org](http://www.tidesdk.org).

Launch the Developer tool, and Import the project. Switch to the **Test & Package** tab, and click **Launch App**. This should build and run the app.

See `anatomy.md` included in this repo which outlines the code.

**Usage**

See in-app Help menu for instructions.

**Help & Support**

* Shopify forums
* Shopify support
* Open a ticket

If you need to send along a log file, it can be found here: ~/Library/Application Support/TideSDK/Shopify Theme/tiapp.log. **DO NOT POST THIS FILE**

**Contributors**

Tetsuro Takara [@t3tchi](https://twitter.com/t3tchi)
Mitchell Amihod [@meeech](https://twitter.com/meeech)

**Thanks**

[TideSDK](http://www.tidesdk.org)
[Listen](https://rubygems.org/gems/listen)
Beta Testers
Shopify
mightyoj
Scott Szarapka
and all you who use the app!