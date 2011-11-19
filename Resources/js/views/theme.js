YUI().use('view','event-custom','event-focus','array-extras', function(Y) { 
///start

Themer.ThemeView = Y.Base.create('themeView', Y.View, [], {
    container: '<li></li>', 
    
    template: Y.one('#theme-li-template').getContent(),
    
    events: {
        'a.external': { click: function(e) {
            e.halt(true);
            Titanium.Platform.openURL(e.currentTarget.get('href'));
        }}
    },
    
    initializer: function() {
        console.log('ThemeView: initializer');
    },
    
    render: function(shopModel) {
        var container = this.container, 
            model = this.model;
        
        var viewButton = function(t) {
            var args = {text: 'Preview', src: 'http://'+shopModel.get('id')+'.myshopify.com/?preview_theme_id='+t.id };
            if('main' == t.role) {
                 args = {text: 'View Shop', src: 'http://'+shopModel.get('id')+'.myshopify.com'};
            }

            return Y.Lang.sub("<a href='{src}' class='btn external'>{text}</a>", args);
        };

        var data = model.toJSON();
        data.viewButton = viewButton(data);
        
        container.setContent(Y.Lang.sub(this.template, data));
        
        return this;
    }
});


///end
});
