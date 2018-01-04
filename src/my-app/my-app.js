// Initialize your app
var myApp = new Framework7();

// Export selectors engine
var $$ = Dom7;

function toast(message) {
    var toast = myApp.toast(message, '', {});
    toast.show()
}
// Add view
var mainView = myApp.addView('.view-main', {
    // Because we use fixed-through navbar we can enable dynamic navbar
    dynamicNavbar: true,
    domCache: true
});

var host = 'http://198.211.112.76:3200/m/'
// var host = 'http://192.168.31.35:3200/m/'

var isBus = true;

var isApp = typeof cordova !== 'undefined'

var gUser;

var pageRefresh


function setItem(key, value) {
    if (isApp) {
        NativeStorage.setItem(key, value);
    } else {
        localStorage.setItem(key, value)
    }
}


function removeItem(key) {
    if (isApp) {
        NativeStorage.remove(key);
    } else {
        localStorage.removeItem(key)
    }
}


function getItem(key, callback) {
    if (isApp) {
        NativeStorage.getItem(key, function (doc) {
            callback(doc)
        }, function (error) {
            callback(null)
        });
    } else {
        callback(localStorage.getItem(key))
    }

}

function storeUser(obj) {
    gUser = obj;
    setItem("user", JSON.stringify(gUser))
}

function removeUser() {
    delete gUser;
    removeItem("user");
}



var onIndexPageInit= myApp.onPageInit('index', function (page) {
    console.log('index init')
    var vue = new Vue({
        el: "[data-page='index']",
        data: {
            waiting: [],
            pickups: [],
            deliveries: [],
        },
        methods: {
            onCallPhone:function (phone) {
                window.plugins.CallNumber.callNumber(null, null, phone, null);
            }
        }
    });
    var waitingPageRefresh = $$("#waiting.pull-to-refresh-content");
    var pickupPageRefresh = $$("#pickup.pull-to-refresh-content");
    var deliveryPageRefresh = $$("#delivery.pull-to-refresh-content");
    waitingPageRefresh.on('refresh', function (event) {
        loadOrder("waiting",waitingPageRefresh,vue.waiting);
    });
    pickupPageRefresh.on('refresh', function (event) {
        loadOrder("pickup",pickupPageRefresh,vue.pickups);
    });
    deliveryPageRefresh.on('refresh', function (event) {
        loadOrder("delivery",deliveryPageRefresh,vue.deliveries);
    });


    $$('#waiting').on('tab:show', function () {
        myApp.pullToRefreshTrigger(waitingPageRefresh);
        pageRefresh = waitingPageRefresh;
    });

    $$('#pickup').on('tab:show', function () {
        myApp.pullToRefreshTrigger(pickupPageRefresh);
        pageRefresh = pickupPageRefresh;
    });

    $$('#delivery').on('tab:show', function () {
        myApp.pullToRefreshTrigger(deliveryPageRefresh);
        pageRefresh = deliveryPageRefresh;
    });
    myApp.pullToRefreshTrigger(waitingPageRefresh);
    pageRefresh = waitingPageRefresh;

})

if (isApp) {
    document.addEventListener("deviceready", onDeviceReady, false);
    function onDeviceReady() {


        setTimeout(function() {
            navigator.splashscreen.hide();
            window.FirebasePlugin.grantPermission();
            window.FirebasePlugin.onNotificationOpen(function(notification) {
                console.log(notification);
                myApp.addNotification({"title":isBus?"Turbo Bussiness":"Turbo","message":notification.aps.alert,"hold":3000});
                if(pageRefresh){
                    myApp.pullToRefreshTrigger(pageRefresh);
                }
            }, function(error) {
                console.error(error);
            });
            if(gUser){
                closeLogin()
            }

        }, 2000);
        document.addEventListener("backbutton", function (event) {
            myApp.hideIndicator()
            var modal = myApp.closeModal()
            if (!modal) {
                if (myApp.getCurrentView().history.length > 1) {
                    myApp.getCurrentView().router.back()
                } else {
                    navigator.app.exitApp()
                }
            }
        }, false);
        userInit(true)
    }
} else {
    userInit(true)

}

function toLogin(first) {
    if(isApp){
        StatusBar.styleDefault();
        $$(".statusbar-overlay").css({"background":"#FFF"});
    }
    var loginVue = new Vue({
        el: ".login-screen",
        data: {
            isBus:isBus,
            name:"",
            password:""
        },
        methods: {
            onLogin:function () {
                if(this.name.length>=6 && this.password.length>=6){
                    myApp.showIndicator();
                    $.get(host + "user/login", {isBus:isBus,name: this.name,password:this.password}, function (result) {
                        myApp.hideIndicator();
                        if(result.code == 200){
                            storeUser(result.content);
                            onIndexPageInit.trigger();
                            closeLogin()
                        }else{
                            toast(result.message);
                        }
                    });
                }else{
                    toast("Name or password too short.");
                }

            },
            onToSign:function () {
                toSign()
            }
        }
    });
    myApp.loginScreen(".login-screen", true)
}

function closeLogin(){
    if(isApp){
        StatusBar.styleLightContent();
        $$(".statusbar-overlay").css({"background":"#C50B28"});
    }
    myApp.closeModal(".login-screen", true);
}

function toSign() {
    var signVue = new Vue({
        el: ".sign-screen",
        data: {
            isBus:isBus,
            user:{
                name:"",
                password:"",
                shopName:"",
                phone:"",
                email:"",
                address:"",
            },
        },
        methods: {
            onClose:function () {
                myApp.closeModal(".sign-screen", true);
            },
            onSign:function () {
                if(this.user.name.length>=6 &&
                    this.user.password.length>=6 &&
                    this.user.shopName.length>=6 &&
                    this.user.phone.length>=6 &&
                    this.user.email.length>=6 &&
                    this.user.address.length>=6
                ){
                    myApp.showIndicator();
                    $.post(host + "user/add?isBus="+isBus, {user:JSON.stringify(this.user)}, function (result) {
                        myApp.hideIndicator();
                        if(result.code == 200){
                            storeUser(result.content);
                            onIndexPageInit.trigger();
                            myApp.closeModal(".sign-screen", true);
                            closeLogin()
                        }else{
                            toast(result.message);
                        }
                    });
                }else{
                    toast("Please check input.");
                }
            }
        }
    });
    myApp.popup(".sign-screen",true, true);
}




function userInit(first) {
    getItem('user', function (doc) {
        if (doc) {
            gUser = JSON.parse(doc)
            onIndexPageInit.trigger()
        } else {//需要先登录
            toLogin(first);
        }
    })
}


function loadOrder(type,content,array) {
    $.get(host + "order/list", {isBus:isBus, userId: gUser._id,type:type}, function (result) {
        if(result.code == 200){
            array.splice(0,array.length);
            array.push.apply(array, result.content);
        }else{
            toast(result.message);
        }
        myApp.pullToRefreshDone(content);
    });
}



var onMePageInit= myApp.onPageInit('me', function (page) {
    console.log('me init')
    var vue = new Vue({
        el: "[data-page='me']",
        data: {
            user:gUser
        },
        methods: {
            onLogout:function () {
                myApp.showIndicator();
                myApp.getCurrentView().router.back({
                    url: 'index.html',
                    force: true
                });
                removeUser();
                setTimeout(function () {
                    myApp.hideIndicator();
                    userInit(false);
                },0.5)


            }
        }
    });
})



var onHistoryPageInit= myApp.onPageInit('history', function (page) {
    console.log('history init')
    var vue = new Vue({
        el: "[data-page='history']",
        data: {
            orders: []
        },
        methods: {
            onCallPhone:function (phone) {
                window.plugins.CallNumber.callNumber(null, null, phone, null);
            }
        }
    });
    var completePageRefresh = $$("#complete.pull-to-refresh-content");
    completePageRefresh.on('refresh', function (event) {
        loadOrder("complete",completePageRefresh,vue.orders);
    });
    myApp.pullToRefreshTrigger(completePageRefresh);
})

var onCreatePageInit= myApp.onPageInit('create', function (page) {
    console.log('create init')
    var vue = new Vue({
        el: "[data-page='create']",
        data: {
            order:{
                title:"",
                shop:{
                    _id:gUser._id,
                    name:gUser.shopName,
                    phone:gUser.phone,
                    address:gUser.address
                },
                consumer:{
                    name:"",
                    phone:"",
                    address:{
                        title:"",
                        lat:"",
                        long:""
                    }
                },
                shipDate:"",
                price:"",
                memo:"",
                state:"waiting",
                type:"normal"
            }
        },
        methods: {
            onSelectAddress:function () {

            },
            onCreate:function () {
                if(this.order.title.length>4 &&
                    this.order.price.length>0 &&
                    this.order.shipDate.length>0 &&
                    this.order.consumer.name.length>4 &&
                    this.order.consumer.phone.length>4 &&
                    this.order.consumer.address.title.length>4){
                    myApp.showIndicator();
                    $.post(host + "order/add", {order:JSON.stringify(this.order)}, function (result) {
                        myApp.hideIndicator();
                        if(result.code == 200){
                            myApp.router.back();
                            var waitingPageRefresh = $$("#waiting.pull-to-refresh-content");
                            myApp.pullToRefreshTrigger(waitingPageRefresh)
                        }else{
                            toast(result.message);
                        }
                    });
                }else{
                    toast("Please fill Order conformation");
                }

            }
        }
    });
})




