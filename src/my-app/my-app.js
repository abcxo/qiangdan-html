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

// var host = 'http://www.dajitogo.com'
var host = 'http://localhost:3100/m/'



var isApp = typeof cordova !== 'undefined'

var user = {
    _id:"xxx",
    name:"wefwfe"
}
function setItem(key, value) {
    if (isApp) {
        NativeStorage.setItem(key, value, function (doc) {
        }, function (error) {
        });
    } else {
        localStorage.setItem(key, value)
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
    user._id = obj._id
    user.name = obj.name
    user.device = obj.device
    user.token = obj.token
    user.phone = obj.phone
    user.password = obj.password
    user.date = obj.date
    setItem("user", JSON.stringify(user))
}

if (isApp) {
    document.addEventListener("deviceready", onDeviceReady, false);
    function onDeviceReady() {
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
        userInit()
    }
} else {
    userInit()
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
        methods: {}
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
    });

    $$('#pickup').on('tab:show', function () {
        myApp.pullToRefreshTrigger(pickupPageRefresh);
    });

    $$('#delivery').on('tab:show', function () {
        myApp.pullToRefreshTrigger(deliveryPageRefresh);
    });
    myApp.pullToRefreshTrigger(waitingPageRefresh);
})

function userInit() {
    console.log("user init");
    getItem('user', function (doc) {
        console.log("user init"+doc);
        if (doc) {
            user = JSON.parse(doc)
            onIndexPageInit.trigger()
        } else {//需要先登录
            // myApp.loginScreen(".login-screen", true)
        }

    })
}
onIndexPageInit.trigger()


function loadOrder(type,content,array) {
    $.get(host + "order", {uid: user._id,type:type}, function (result) {
        if(result.code == 200){
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

        },
        methods: {}
    });

})



var onIndexPageInit= myApp.onPageInit('history', function (page) {
    console.log('history init')
    var vue = new Vue({
        el: "[data-page='history']",
        data: {
            completes: []
        },
        methods: {}
    });
    var completePageRefresh = $$("#complete.pull-to-refresh-content");
    completePageRefresh.on('refresh', function (event) {
        loadOrder("complete",completePageRefresh,vue.completes);
    });
    myApp.pullToRefreshTrigger(completePageRefresh);
})


