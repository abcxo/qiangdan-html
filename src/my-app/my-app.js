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

// var host = 'http://198.211.112.76:3200/m/'
// var host = 'http://192.168.0.111:3200/m/'
var host = 'http://localhost:3200/m/'

var isBus = false

var isApp = typeof cordova !== 'undefined'

var gUser;

var gToken;

var pageRefresh;


var busConfig = {
    apiKey: "AIzaSyAwMxxByhvYlUF67GyIzy8iBSR1MrLDe04",
    authDomain: "turbo-bus.firebaseapp.com",
    storageBucket: "gs://turbo-bus.appspot.com"
};

firebase.initializeApp(busConfig);


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


function onOrderAction(order) {
    var state = order.state;
    if (isBus) {
        var actionSheetButtons = [
            // First buttons group
            [
                // Group Label
                {
                    text: 'You can edit the order or cancel your order before waiting for the receipt.',
                    label: true
                },
                // First button
                {
                    text: 'Edit',
                    onClick: function () {
                        myApp.getCurrentView().router.load({
                            url: 'create.html',
                            query: {isEdit: true,order:order}
                        })
                    }
                },
                // Another red button
                {
                    text: 'Delete',
                    onClick: function () {
                        onAction()
                    }
                },
            ],
            // Second group
            [
                {
                    text: 'Cancel',
                    color:"blue"
                }
            ]
        ];
        if(order.state != "waiting"){
            actionSheetButtons = [
                // First buttons group
                [
                    // Group Label
                    {
                        text: 'You can edit the order or cancel your order before waiting for the receipt.',
                        label: true
                    },
                    // Another red button
                    {
                        text: 'Delete',
                        onClick: function () {
                            onAction()
                        }
                    },
                ],
                // Second group
                [
                    {
                        text: 'Cancel',
                        color:"blue"
                    }
                ]
            ];
        }
        state = "cancel";
        myApp.actions(actionSheetButtons)

    } else {
        if (order.state == "waiting") {
            state = "pickup";
        } else if (order.state == "pickup") {
            state = "delivery";
        } else if (order.state == "delivery") {
            state = "complete";
        }
        onAction()
    }

    function onAction() {
        $.post(host + "order/editState", {
            isBus: isBus,
            orderId: order._id,
            user: JSON.stringify({
                _id: gUser._id,
                icon: gUser.icon,
                name: gUser.name,
                phone: gUser.phone,
                address: gUser.address
            }),
            state: state
        }, function (result) {
            if (result.code == 200) {
            } else {
                toast(result.message);
            }
            if(pageRefresh){
                myApp.pullToRefreshTrigger(pageRefresh);
            }

        });
    }


}


function imgResize(file, callback){
    var fileReader = new FileReader();
    fileReader.onload = function(){
        var IMG = new Image();
        IMG.src = this.result;
        IMG.onload = function(){
            var w = this.naturalWidth, h = this.naturalHeight, resizeW = 0, resizeH = 0;
            // maxSize 是压缩的设置，设置图片的最大宽度和最大高度，等比缩放，level是报错的质量，数值越小质量越低
            var maxSize = {
                width: 200,
                height: 200,
                level: 0.6
            };
            if(w > maxSize.width || h > maxSize.height){
                var multiple = Math.max(w / maxSize.width, h / maxSize.height);
                resizeW = w / multiple;
                resizeH = w / multiple;
            } else {
                // 如果图片尺寸小于最大限制，则不压缩直接上传
                return callback(file)
            }
            var canvas = document.createElement('canvas'),
                ctx = canvas.getContext('2d');
            if(window.navigator.userAgent.indexOf('iPhone') > 0){
                canvas.width = resizeH;
                canvas.height = resizeW;
                ctx.rorate(90 * Math.PI / 180);
                ctx.drawImage(IMG, 0, -resizeH, resizeW, resizeH);
            }else{
                canvas.width = resizeW;
                canvas.height = resizeH;
                ctx.drawImage(IMG, 0, 0, resizeW, resizeH);
            }
            var base64 = canvas.toDataURL('image/jpeg', maxSize.level);
            convertBlob(window.atob(base64.split(',')[1]), callback);
        }
    };
    fileReader.readAsDataURL(file);
}



var onIndexPageInit = myApp.onPageInit('index', function (page) {
    console.log('index init')
    var vue = new Vue({
        el: "[data-page='index']",
        data: {
            waiting: [],
            pickups: [],
            deliveries: [],
            isBus: isBus
        },
        methods: {
            onCallPhone: function (phone) {
                window.plugins.CallNumber.callNumber(null, null, phone, null);
            },
            onJumpAddress: function (address) {
                if (isApp) {
                    map.jumpAddress(address)
                }
            },
            onAction: function (order) {
                onOrderAction(order)
            }


        }
    });
    var waitingPageRefresh = $$("#waiting.pull-to-refresh-content");
    var pickupPageRefresh = $$("#pickup.pull-to-refresh-content");
    var deliveryPageRefresh = $$("#delivery.pull-to-refresh-content");
    waitingPageRefresh.on('refresh', function (event) {
        loadOrder("waiting", waitingPageRefresh, vue.waiting);
    });
    pickupPageRefresh.on('refresh', function (event) {
        loadOrder("pickup", pickupPageRefresh, vue.pickups);
    });
    deliveryPageRefresh.on('refresh', function (event) {
        loadOrder("delivery", deliveryPageRefresh, vue.deliveries);
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
        setTimeout(function () {
            navigator.splashscreen.hide();
            window.FirebasePlugin.grantPermission();
            window.FirebasePlugin.onTokenRefresh(function(token) {
                console.log(token);
                gToken = token
            }, function(error) {
                console.error(error);
            });
            window.FirebasePlugin.onNotificationOpen(function (notification) {
                console.log(notification);
                myApp.addNotification({
                    "title": "Turbo",
                    "message": notification.aps.alert.title?notification.aps.alert.title:notification.aps.alert,
                    "hold": 5000
                });
                if (pageRefresh) {
                    myApp.pullToRefreshTrigger(pageRefresh);
                }
            }, function (error) {
                console.error(error);
            });
            if (gUser) {
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
    if (isApp) {
        StatusBar.styleDefault();
        $$(".statusbar-overlay").css({"background": "#FFF"});
    }
    var loginVue = new Vue({
        el: ".login-screen",
        data: {
            isBus: isBus,
            name: "",
            password: ""
        },
        watch: {
            'isBus': function (val, oldVal) {
                isBus = val;
                setItem("isBus",val?'true':'false');
            }
        },
        methods: {
            onTypeSelect:function (isBus) {
                console.log(isBus)
                this.isBus = isBus
            },
            onLogin: function () {
                if (this.name.length >= 6 && this.password.length >= 6) {
                    myApp.showIndicator();
                    $.get(host + "user/login", {
                        isBus: isBus,
                        name: this.name,
                        password: this.password,
                        token:gToken
                    }, function (result) {
                        myApp.hideIndicator();
                        if (result.code == 200) {
                            storeUser(result.content);
                            onIndexPageInit.trigger();
                            closeLogin()
                        } else {
                            toast(result.message);
                        }
                    });
                } else {
                    toast("Name or password too short.");
                }

            },
            onToSign: function () {
                toSign()
            }
        }
    });
    myApp.loginScreen(".login-screen", true)
}

function closeLogin() {
    if (isApp) {
        StatusBar.styleLightContent();
        $$(".statusbar-overlay").css({"background": "#C50B28"});
    }
    myApp.getCurrentView().router.back({
        animatePages: false
    })
    myApp.closeModal(".login-screen", true);
}



function toSign() {
    var signVue = new Vue({
        el: ".sign-screen",
        data: {
            isBus: isBus,
            user: {
                icon: "",
                name: "",
                password: "",
                shopName: "",
                phone: "",
                email: "",
                address: null
            },
        },
        methods: {
            onClose: function () {
                myApp.closeModal(".sign-screen", true);
            },
            onAvatar: function () {
                $$(".uploadAvatar").click();
            },
            onUploadAvatar: function (event) {
                var vue = this;
                var file = event.currentTarget.files[0];
                if (file) {
                    myApp.showIndicator();
                    var reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = function (e) {
                        vue.user.icon = this.result;
                        var storageRef = firebase.storage().ref();
                        storageRef.child('images/avatar/' + file.name).put(file).then(function (snapshot) {
                            vue.user.icon = snapshot.downloadURL;
                            myApp.hideIndicator();
                        });
                    }
                }

            },
            onSelectAddress: function (event) {
                var vue = this;
                if (isApp) {
                    map.selectAddress(vue.user.address, function (address) {
                        vue.user.address = address;
                    })
                }
            },
            onSign: function () {
                if (this.user.icon.length >= 6 &&
                    this.user.name.length >= 6 &&
                    this.user.password.length >= 6 &&
                    this.user.shopName.length >= 6 &&
                    this.user.phone.length >= 6 &&
                    this.user.email.length >= 6
                    && this.user.address
                ) {
                    myApp.showIndicator();
                    this.user.token = gToken;
                    $.post(host + "user/add", {isBus:isBus,user: JSON.stringify(this.user)}, function (result) {
                        myApp.hideIndicator();
                        if (result.code == 200) {
                            storeUser(result.content);
                            onIndexPageInit.trigger();
                            myApp.closeModal(".sign-screen", true);
                            closeLogin()
                        } else {
                            toast(result.message);
                        }
                    });
                } else {
                    toast("Please check input.");
                }
            }
        }
    });
    myApp.popup(".sign-screen", true, true);
}


function userInit(first) {
    getItem("isBus",function (doc) {
        if(doc){
            isBus = doc == "true"?true:false;
        }else{
            isBus = false;
        }
        getItem('user', function (doc) {
            if (doc) {
                gUser = JSON.parse(doc)
                onIndexPageInit.trigger()
            } else {//需要先登录
                toLogin(first);
            }
        })
    });

}


function loadOrder(type, content, array) {
    $.get(host + "order/list", {isBus: isBus, userId: gUser._id, type: type}, function (result) {
        if (result.code == 200) {
            array.splice(0, array.length);
            array.push.apply(array, result.content);
        } else {
            toast(result.message);
        }
        myApp.pullToRefreshDone(content);
    });
}


var onMePageInit = myApp.onPageInit('me', function (page) {
    console.log('me init')
    var vue = new Vue({
        el: "[data-page='me']",
        data: {
            user: gUser
        },
        methods: {
            onLogout: function () {
                myApp.showIndicator();
                $.post(host + "user/logout", {
                    isBus: isBus,
                    userId: this.user._id,
                }, function (result) {
                    myApp.hideIndicator();
                    if (result.code == 200) {
                        removeUser();
                        userInit(false);
                    } else {
                        toast(result.message);
                    }
                });
            }
        }
    });
})


var onHistoryPageInit = myApp.onPageInit('history', function (page) {
    console.log('history init')
    var vue = new Vue({
        el: "[data-page='history']",
        data: {
            orders: [],
            isBus: isBus
        },
        methods: {
            onCallPhone: function (phone) {
                window.plugins.CallNumber.callNumber(null, null, phone, null);
            },
            onJumpAddress: function (address) {
                if (isApp) {
                    map.jumpAddress(address)
                }
            },
            onAction: function (order) {
                onOrderAction(order)
            }
        }
    });
    var completePageRefresh = $$("#complete.pull-to-refresh-content");
    completePageRefresh.on('refresh', function (event) {
        loadOrder("complete", completePageRefresh, vue.orders);
    });
    myApp.pullToRefreshTrigger(completePageRefresh);
})

var onCreatePageInit = myApp.onPageInit('create', function (page) {
    console.log('create init')
    function getDate() {
        var format = "";
        var nTime = new Date();
        format += nTime.getFullYear() + "-";
        format += (nTime.getMonth() + 1) < 10 ? "0" + (nTime.getMonth() + 1) : (nTime.getMonth() + 1);
        format += "-";
        format += nTime.getDate() < 10 ? "0" + (nTime.getDate()) : (nTime.getDate());
        format += "T";
        format += nTime.getHours() < 10 ? "0" + (nTime.getHours()) : (nTime.getHours());
        format += ":";
        format += nTime.getMinutes() < 10 ? "0" + (nTime.getMinutes()) : (nTime.getMinutes());
        format += ":00";
        return format;
    }

    var vue = new Vue({
        el: "[data-page='create']",
        data: {
            isEdit:false,
            order: {
                title: "",
                fee:-1,
                shop: {
                    _id: gUser._id,
                    icon: gUser.icon,
                    name: gUser.name,
                    shopName: gUser.shopName,
                    phone: gUser.phone,
                    address: gUser.address
                },
                consumer: {
                    icon: "",
                    name: "",
                    phone: "",
                    address: null
                },
                shipDate: getDate(),
                price: "",
                memo: "",
                state: "waiting",
            }
        },
        methods: {
            onSelectAddress: function () {
                var vue = this;
                if (isApp) {
                    map.selectAddress(vue.order.consumer.address, function (address) {
                        vue.order.consumer.address = address;
                        myApp.showIndicator();
                        $.post(host + "order/fee", {isBus: isBus,order: JSON.stringify(vue.order)}, function (result) {
                            myApp.hideIndicator();
                            if (result.code == 200) {
                                vue.order.fee = result.content;
                            } else {
                                toast(result.message);
                            }
                        });
                    })
                }
            },
            onCreate: function () {
                if (this.order.title.length > 4 &&
                    this.order.price.length > 0 &&
                    this.order.shipDate.length > 0 &&
                    this.order.consumer.name.length > 4 &&
                    this.order.consumer.phone.length > 4 &&
                    this.order.consumer.address) {
                    myApp.showIndicator();
                    $.post(host + (this.isEdit?"order/edit":"order/add"), {isBus: isBus,order: JSON.stringify(this.order)}, function (result) {
                        myApp.hideIndicator();
                        if (result.code == 200) {
                            myApp.getCurrentView().router.back();
                            var waitingPageRefresh = $$("#waiting.pull-to-refresh-content");
                            myApp.pullToRefreshTrigger(waitingPageRefresh)
                        } else {
                            toast(result.message);
                        }
                    });
                } else {
                    toast("Please fill Order conformation");
                }

            }
        }
    });

    if(page.query.isEdit){
        vue.isEdit = page.query.isEdit;
        vue.order = page.query.order;
    }
})




