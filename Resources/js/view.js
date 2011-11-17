YUI().use('view','panel', 'event-custom','event-focus', function(Y) { 
///start

Themer.appView = Y.Base.create('appView', Y.View, [], {
   
    container: Y.one('#container'),

    events: {
        '#add-shop' : { click: 'addShop'}
    },
   
    initializer: function() {
        console.log('appView: Initializer');

        //Setup the Add Shop form overlay
        this.addShopForm = createAddShopPanel();

        var shops = this.shops = new Themer.shopList();
        shops.after('add', this.add, this);
        shops.after('remove', this.remove, this);        

        //Reset also fires on initial model list load. 
        shops.after('reset', this.render, this);

        shops.load();

        //Custom event that gets the new shop data from form, and creates the model.
        Y.on('addShopOk', function(shopData) {
            console.log('appView: addShopOk');
            this.shops.create(shopData);
        }, this);

    },

    render: function(e) {
        console.log('appView: render');

        if(this.shops.isEmpty()) {
            console.log('No Shops! Show Onboard!');
            Y.one('#onboard').removeClass('util-hide');
            return this;
        }

        Y.one('#onboard').addClass('util-hide');

        var fragment = Y.one(Y.config.doc.createDocumentFragment());

        Y.Array.each(e.models, function (model) {
            console.log(model.get('id'));
            var view = new Themer.ShopView({
                model: model,
                container: Y.Lang.sub('<div id="{store}" class="shop-themes"></div>', {store: model.get('id')})
            });
            fragment.append(view.render().container);
        });

        this.container.one('#content').setContent(fragment);

        return this;
    },
   
    // Click handler for the add shop button
    addShop: function(e) {
        this.addShopForm.show();
    }, 

    //Called when shop added to the shops list
    add: function(e) {
        console.log('appView: New Shop Added');
        var view = new Themer.ShopView({
            model: e.model,
            container: Y.Lang.sub('<div id="{store}" class="shop-themes"></div>', {store: e.model.get('id')})
        });
        
        this.container.one('#content').append(view.render().container);
    },

    remove: function(e) {
        console.log('appView: Shop Removed');
    }

});

var createAddShopPanel = function() {

    var panel = new Y.Panel({
        srcNode: '#add-shop-panel',
        width: 400, 
        centered: true,
        visible: false,
        modal: true,
        headerContent: 'Add A New Shop',
        zIndex: 10
    });
    
    panel.addButton({
        id: 'addShopOk',
        value: 'Add Shop',
        action: function(e) {
            e.preventDefault(); 

            var data = {
                id: Y.one('input[name=id]').get('value'),
                api_key: Y.one('input[name=api_key]').get('value'),
                password: Y.one('input[name=password]').get('value')
            };
            
            //@todo validate data
            //Assuming its ok...
            Y.fire('addShopOk', data);
            panel.hide();
        },
        section: Y.WidgetStdMod.FOOTER
    });

    panel.addButton({
        value: 'Cancel',
        action: function(e) {
            e.preventDefault(); 
            panel.hide();
        },
        section: Y.WidgetStdMod.FOOTER
    });

    panel.render();
    Y.one('#add-shop-panel').removeClass('util-hide');

    return panel;
};


Themer.ShopView = Y.Base.create('shopView', Y.View, [], {

    //Will pass in a custom container at instantiation
    //    <div id='{store}' class='shop-themes'></div>
    // container: Y.one('#shop-template').getContent(), 
    template: Y.one('#shop-template').getContent(),
    
    events: {
        'button.add-theme': { click: 'addTheme'},
        'button.remove-shop': { click: 'remove'}
    },
    
    initializer: function() {
        var model = this.model;
        
        model.after('destroy', this.destroy, this);
    },
    
    render: function() {
        var container = this.container, 
            model = this.model;
            
        container.setContent(Y.Lang.sub(this.template, {
            store: model.get('id')
        }));
        
        return this;
    },
    
    remove: function(e) {
        console.log('ShopView:remove');
        this.constructor.superclass.remove.call(this);
        this.model.destroy({'delete': true});
    }
});


///end
});
