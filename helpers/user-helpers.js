var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')
var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { resolve } = require('path')
const { disabled, response } = require('../app')
const express = require('express');
const paypal = require('paypal-rest-sdk');
const { count } = require('console')
const e = require('express')
var instance = new Razorpay({
    key_id: 'rzp_test_1n0N0tiDkbPbT2',
    key_secret: 'yUtLHenOPpYsSL0u6dOlsz0p',
});
paypal.configure({
    'mode': 'sandbox',
    'client_id': 'AVkgVa5jL54LF5m-ZxU9sdIDkr2_o8zhl08KehVCuNWQcIPkWzDq3xMZuDuW0odLjQjRUqmNV_UFp91a',
    'client_secret': 'EI9VQBU_IWQ_UYWthj69soPkJuWVZCbhfYiOLAePRldL4EVL3KxiTmQxrfBzMrbdq4nLAgjfAhCF_FWE'
});

const accountsid='AC1f38cfd7db296a630c7fc5e288561916'
const authToken='aab5aebf467252f71d47242daf3ed4e7'

const client = require('twilio')(accountsid,authToken);
const serviceID='VA6a27ad98b33805dedfc9c64129d92ade'

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let email = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });
            if (email) {
                console.log('same email');
                response.status = true
                resolve(response)

            } else {
                userData.Password = await bcrypt.hash(userData.Password, 10)
                db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                    resolve(data.insertedId)
                })
                userData.userStatus = true

                console.log('no same email');
                resolve({ status: false })
            }


        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("login success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("login failed");
                        resolve({ status: false })  
                    }
                })
            } else {
                console.log("login failed");
                resolve({ status: false })
            }
        })
    },
    doOtpLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user= await db.get().collection(collection.USER_COLLECTION).findOne({Phone:userData.Phonenumber})
            if(user){
                if(user.userStatus){
                    let mobileNumber= user.Phone
                    client.verify.services(serviceID)
                    .verifications
                    .create({to: '+91' + mobileNumber, channel: 'sms'})
                    .then((verification) =>{
                        console.log(verification.status);
                        console.log('verification');
                    }).catch((err)=>{
                        console.log('doOtplogin');
                        console.log(err);
                    })
                    response.user=user
                    response.userStatus=true
                    resolve(response)
                }else response.userStatus=false
            }else{
                err='Phone number does not exist'
                reject(err)
            }
        })
    },
    doVerify:(otp,userData)=>{
        return new Promise((resolve,reject)=>{
            let mobileNumber = userData.Phone
            client.verify.services(serviceID)
            .verificationChecks
            .create({to: '+91' + mobileNumber, code: otp})
            .then((verification_check)=>{
                if(verification_check.status =='approved'){
                    resolve(userData)
                }
            }).catch((err)=>{
                console.log(err);
            })
        })
    },
    getAlluser: () => {
        return new Promise(async (resolve, reject) => {
            let userList = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(userList)
        })
    },
    blockUsers: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    userStatus: false
                }
            }).then((response) => {
                resolve(response)
            }).catch((err)=>{
                reject(err)
            })
        })
    },
    unblockUsers: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    userStatus: true
                }
            }).then((response) => {
                resolve(response)
            }).catch((err)=>{
                reject(err)
            })
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1,

        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: proObj }
                        }).then((response) => {
                            resolve()
                        })
                }

            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },

                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                        
                    }
                }


            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }).then((response) => {

                        resolve({ status: true })
                    })
            }
            
        })
    },
    deleteCartProducts: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                {
                    $pull: { products: { item: objectId(details.product) } }
                }
            ).then((response) => {
                resolve({ removeProduct: true })
            })
        })
    },
    totalCartPrice: (userId) => {
        return new Promise(async (resolve, reject) => {
            let totalPrice = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },

                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { 
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] },
                    }
                },
                { 
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: 1,
                        price:{
                            $cond:{
                                if:'$product.offer', then:'$product.offerPrice',
                                else:'$product.price'
                            }
                        },
                        discountPrice:'$product.discountPrice'
                    } 
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$price' }] } },
                        discount:{ $sum: { $multiply: ['$quantity', { $toInt: '$discountPrice' }] } }
                       
                    }
                } 


            ]).toArray()
            console.log('cart total price');
            console.log(totalPrice[0]);
            resolve(totalPrice[0])

        })
    },
   
    cartEachProductPrice: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartProductPrice = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                        product: 1,
                        quantity: 1,
                        cartProductPrice: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } },
                        cartOfferPrice:  { $sum: { $multiply: ['$quantity', { $toInt: '$product.offerPrice' }] } }
                    }
                }


            ]).toArray()
            
            resolve(cartProductPrice) 
        })
    },
    cartEachProductsPrice: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartProductPrice = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] },
                        price:{
                            $cond:{
                                if:'$product.offer', then:'$product.offerPrice',
                                else:'$product.price'
                            }
                        }
                    }
                },
                {
                    $project: {
                        product: 1,
                        quantity: 1,
                        cartProductPrice: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }
                        // cartOfferPrice:  { $sum: { $multiply: ['$quantity', { $toInt: '$product.offerPrice' }] } }
                    }
                }


            ]).toArray()
            console.log('change cart product price');
            console.log('cartProductsPrice');
            console.log(cartProductPrice);
            
            resolve(cartProductPrice) 
        })
    },
    placeOrder: (order, products, totalPrice, stock) => {
        return new Promise((resolve, reject) => {
            console.log('order coupon check');
            console.log(order);
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: objectId(order.address),
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: totalPrice,
                status: status,
                // date:(new Date().toLocaleDateString("en-US")), 
                date: new Date()

            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then(async (response) => {
                let stock = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: objectId(order.userId) }
                    },
                    {
                        $unwind: '$products'
                    },

                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity',

                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            stock: '$product.qty',
                            quantity: 1,
                            stockDisplay: { $subtract: ['$stock', '$quantity'] }
                        },

                    },
                    {
                        $unwind: '$stock'
                    },
                    {
                        $project: {
                            stockDisplay: { $subtract: [{ $toInt: '$stock' }, '$quantity'] }
                        }
                    }
                ]).toArray()



                let proId = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            product: '$products.item'
                        }
                    }
                ]).toArray()
                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId[0].product) }, { $set: { qty: stock[0].stockDisplay } })
                console.log('proId');
                console.log(proId[0].product);
                console.log(stock);
                console.log(stock[0].stockDisplay);
                console.log('status placed');
                console.log(orderObj.status);
                
                
                    db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })

             
                resolve(response.insertedId)
                
                
            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.products)


           
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        userId: objectId(userId)
                    }
                },
                {
                    $project: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        paymentMethod: 1,
                        totalAmount: 1,
                        status: 1,
                        return: 1,
                        cancel:1

                    }
                },
                {
                    $sort:
                    {
                        date:-1
                    }
                }
            ]).toArray()
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise( (resolve, reject) => {
             db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },

                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1, 
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }


            ]).toArray().then((products) => {
                resolve(products)
            }).catch((err)=>{
                reject(err)
            })
            
        })
    },
    cancelOrder: (orderId,userId) => {
        return new Promise(async(resolve, reject) => {

            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: { status: 'cancel', return: false, cancel:true }
                }).then((response) => {
                    resolve(response)
                }) 

                let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:objectId(orderId)})
              if(order.paymentMethod!='COD'){
                let wallet = await db.get().collection(collection.WALLET_COLLECTION).findOne({user:objectId(userId)})
                if(wallet){
                    let walletTotal = parseInt(wallet.total) +  parseInt(order.totalAmount);
                    await db.get().collection(collection.WALLET_COLLECTION).updateOne({user:objectId(userId)},
                    {
                        $set:{total:walletTotal}
                    })
                    await db.get().collection(collection.WALLET_COLLECTION).updateOne({user:objectId(userId)},{
                        $push:{
                            transaction:{
                                walletAmount:order.totalAmount, 
                                orderId:objectId(orderId), 
                                status:true
                            }  
                          
                        } 
                    })
                }else{
                    let walletDetails={
                        total:order.totalAmount, 
                        user:objectId(order.userId),
                        transaction:[{
                            walletAmount:order.totalAmount, 
                            orderId:orderId, 
                            status:true
                        }]
                    }
                    await db.get().collection(collection.WALLET_COLLECTION).insertOne(walletDetails).then((response)=>{
                        resolve(response)
                    })
                }
              }
        })

        
    },
    getAdminOrder: () => {
        return new Promise(async (resolve, reject) => {
            let userDetails = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                // {
                //     $match: { user: objectId(userId) }
                // },
                // {
                //     $unwind: '$products'
                // },

                // {
                //     $project: {
                //         userId: '$user',

                //     }
                // },
                {
                    $lookup: {
                        from: collection.USER_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },
                {
                    $project: {
                        userDetails: '$userDetails.Name', 
                        paymentMethod: 1, 
                        totalAmount: 1, 
                        status: 1, 
                        deliveryDetails: 1, 
                        products: 1, 
                        date: 1
                    }
                }


            ]).toArray()
            resolve(userDetails)
        })
    },
    OrderShip: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: { status: 'shipped', return: false }
                }).then((response) => {
                    resolve(response)
                }).catch((err)=>{
                    reject(err)
                })
        })

    },
    OrderCancel: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: { status: 'Canceled', return: false }
                }).then((response) => {
                    resolve(response)
                }).catch((err)=>{
                    reject(err)
                })
        })

    },
    OrderDelivered: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: { status: 'Delivered', return: true }
                }).then((response) => {
                    resolve(response)
                }).catch((err)=>{
                    reject(err)
                })
        })
    },
    OrderOutForDelivery: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: { status: 'Out for Delivery', return: false }
                }).then((response) => {
                    resolve(response)
                }).catch((err)=>{
                    reject(err)
                })
        })
    },
    OrderReturn: (orderId,userId) => {
        return new Promise(async(resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: { status: 'Return', return: false }
                }).then((response) => {
                    resolve(response)
                })

                let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:objectId(orderId)})
              if(order.paymentMethod!='COD'){
                let wallet = await db.get().collection(collection.WALLET_COLLECTION).findOne({user:objectId(userId)})
                if(wallet){
                    let walletTotal = parseInt(wallet.total) +  parseInt(order.totalAmount);
                    await db.get().collection(collection.WALLET_COLLECTION).updateOne({user:objectId(userId)},
                    {
                        $set:{total:walletTotal}
                    })
                    await db.get().collection(collection.WALLET_COLLECTION).updateOne({user:objectId(userId)},{
                        $push:{
                            transaction:{
                                walletAmount:order.totalAmount, 
                                orderId:orderId, 
                                status:true
                            }  
                          
                        } 
                    })
                }else{
                    let walletDetails={
                        total:order.totalAmount, 
                        user:objectId(order.userId),
                        transaction:[{
                            walletAmount:order.totalAmount, 
                            orderId:orderId, 
                            status:true
                        }]
                    }
                    await db.get().collection(collection.WALLET_COLLECTION).insertOne(walletDetails).then((response)=>{
                        resolve(response)
                    })
                }
              }
        })
    },
    stockOfEachProduct: (userId) => {
        return new Promise(async (resolve, reject) => {
            let stock = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },

                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',

                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        stock: '$product.qty'
                    }
                }


            ]).toArray()
            resolve(stock)

        }) 
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                console.log("new", order);
                if (err) {
                    console.log(err);
                } else {
                    console.log(order);
                    resolve(order)
                }

            });
        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'yUtLHenOPpYsSL0u6dOlsz0p')
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: { status: 'placed', cancel:false }
                }).then(() => {

                    resolve()
                }) 
        }) 
    },
    getUserProfile: (userId) => {
        return new Promise(async (resolve, reject) => {
            let usersDetails = await db.get().collection(collection.USER_COLLECTION).find({ _id: objectId(userId) }).toArray()
            resolve(usersDetails) 
        })
    },
    addAddress: (Address) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).insertOne(Address).then((data) => {
                resolve(data.insertedId)
            })
        })

    },
    getAddress: (userid) => {
        return new Promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.ADDRESS_COLLECTION).find({ userId: userid }).toArray()
            resolve(address)
        })
    },
    getAddressLimit: (userid) => {
        return new Promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.ADDRESS_COLLECTION).find({ userId: userid }).limit(1).toArray()
            resolve(address)
        })
    },
    changePassword: (userData) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then(async (status) => {
                    if (status) {
                        let Password = await bcrypt.hash(userData.NewPassword, 10)
                        db.get().collection(collection.USER_COLLECTION).updateOne({ Email: userData.Email },
                            {
                                $set: { Password: Password }
                            }).then(() => {
                                resolve({ status: true })
                            })
                    } else {
                        console.log('password incorrect');
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("no user");
                resolve({ status: false })
            }

        })
    },
    generatePaypal: (orderId, total) => {
        return new Promise((resolve, reject) => {

            const create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3000/success",
                    "cancel_url": "http://localhost:3000/cancel"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": "Red Sox Hat",
                            "sku": "001",
                            "price": total,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": total
                    },
                    "description": "Hat for the best team ever"
                }]
            };

            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    throw error;
                } else {
                    resolve(payment)
                }
            });

        });
    },
    getUserDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) }).then((user) => {
                resolve(user)
            }).catch((err)=>{
                reject(err)
            })
        })
    },
    updateProfile: (userId, userDetails) => {
        return new Promise(async (resolve, reject) => {
            let email = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userDetails.Email })
            if (email) {


                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) },
                    {
                        $set: {
                            Name: userDetails.Name,
                            Phone: userDetails.Phone
                        }

                    }).then((response) => {
                        resolve(response)
                    })

            } else {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) },
                    {
                        $set: {
                            Name: userDetails.Name,
                            Phone: userDetails.Phone,
                            Email: userDetails.Email
                        }

                    }).then((response) => {
                        resolve(response)
                    })

            }

        })
    },
    getAddressDetails: (orderId) => {
        return new Promise( (resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $project: {
                        _id: 0,
                        item: '$deliveryDetails'
                    }
                },
                {
                    $lookup: {
                        from: collection.ADDRESS_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'address'
                    }
                },
                {
                    $project: {
                        address: { $arrayElemAt: ['$address', 0] }
                    }
                }
            ]).toArray().then((address) => {
                resolve(address)
            }).catch((err)=>{
                reject(err)
            })
            
            
        })

    },
    deleteAddress: (addressId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).deleteOne({ _id: objectId(addressId) }).then((response) => {
                resolve(response)
                resolve({ status: false })
            }).catch((err)=>{
                reject(err)
            })
            
        })
    },
    wishlist: (prodId, userId) => {
        let prodObj = {
            item: objectId(prodId)
        }
        return new Promise(async (resolve, reject) => {
            let userWishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (userWishlist) {
                let proExist = userWishlist.products.findIndex(product => product.item == prodId)
                if (proExist != -1) {
                    db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $pull: { products: { item: objectId(prodId) } }
                        })
                } else {
                    db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: prodObj }
                        }).then((response) => {
                            resolve()
                        })
                }

            } else {
                let wishlistObj = {
                    user: objectId(userId),
                    products: [prodObj]
                }

                db.get().collection(collection.WISHLIST_COLLECTION).insertOne(wishlistObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getWishlistProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishlistproduct = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            resolve(wishlistproduct)
        })
    },
    deleteWishlistProducts: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ _id: objectId(data.wishlist) },
                {
                    $pull: { products: { item: objectId(data.product) } }
                }).then((response) => {
                    resolve({ removeProduct: true })
                })
        })
    },
    getWishlistCount: (userId) => {
        return new Promise((resolve, reject) => {
            let count = 0
            let wishlist = db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (wishlist) {
                // count = wishlist.products.length
            }
            resolve(count)
        }) 
    },
    applyCoupon: (data,products) => {
        console.log('coupon details');
        console.log(data);
        console.log(data.totalPrice);
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ coupon: data.name })
            if (coupon) {
                
                let currentdate = new Date()
                let expDate = new Date(coupon.expdate)
                if (currentdate <= expDate) {
                    let user=(coupon.users).includes((data.user))
                    if (user) {
                        console.log('userExist');
                        resolve({ userExist: true }) 
                    } else {
                        db.get().collection(collection.COUPON_COLLECTION).updateOne({ coupon: data.name },
                            {
                                $push: { users: (data.user),products }
                            }).then((response) => {
                                let discount = data.totalPrice * (coupon.discount / 100)
                                
                                let newTotal = data.totalPrice - discount
                                response.coupon=discount
                                response.totalPrice = newTotal
                                console.log('total price in coupon route');
                                console.log(response.totalPrice.total);
                                console.log(response.totalPrice);
                                resolve(response)
                            })
                    }                    
                } else {
                    console.log(currentdate);
                    console.log(expDate);
                    console.log('coupon expired');
                    resolve({ couponExp: true })

                }
            } else {
                resolve({ noCouponExist: true })
            }
        })
    },
    orderInvoice: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        _id: objectId(orderId)
                    }
                },
                {
                    $unwind:'$products'
                },
                {
                    $project: {
                        date: 1,
                        paymentMethod: 1,
                        deliveryDetails: 1,
                        totalAmount: 1,
                        status: 1,
                        item: "$products.item",
                        quantity: "$products.quantity",
                        userId: 1
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $lookup: {
                        from: collection.USER_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $lookup: {
                        from: collection.ADDRESS_COLLECTION,
                        localField: 'deliveryDetails',
                        foreignField: '_id',
                        as: 'address'
                    }
                },
                {
                    $unwind: '$quantity'
                },

                {
                    $project: {
                        date: 1,
                        paymentMethod: 1,
                        totalAmount: 1,
                        status: 1,
                        quantity: 1,
                        item: { $arrayElemAt: ['$products', 0] },
                        userId: { $arrayElemAt: ['$user', 0] },
                        address: { $arrayElemAt: ['$address', 0] },
                        ProductPrice:{$sum:{$multiply:['$quantity',{$toInt:'$item.price'}]}}
                    }
                },
                
                {
                    $project: {
                        date: { $dateToString: { format: "%d-%m-%Y", date: "$date" } },
                        paymentMethod: 1,
                        totalAmount: 1,
                        status: 1, 
                        quantity: 1,
                        item: 1,
                        userId: 1,
                        address: 1,
                          ProductPrice:{$sum:{$multiply:['$quantity',{$toInt:'$item.price'}]}}
                    }
                }  
                
            ]).toArray().then((invoice)=>{
                resolve(invoice)
            }).catch((err)=>{
                reject(err)
            })
           

        })
    },
    invoiceTotalPrice:(orderId)=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },

                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: 1,
                        price:{
                            $cond:{
                                if:'$product.offer', then:'$product.offerPrice',
                                else:'$product.price'
                            }
                        },
                        discountPrice:'$item.discountPrice'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$price' }] } },
                        subtotal: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } },
                        discount:{ $sum: { $multiply: ['$quantity', { $toInt: '$product.discountPrice' }] } }
                    }
                }


            ]).toArray().then((totalPrice)=>{
                resolve(totalPrice)
            }).catch((err)=>{
                reject(err)
            })
            
        })
    },
    cancelPaymentWallet:(userId,orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let wallet=await db.get().collection(collection.WALLET_COLLECTION).findOne({user:objectId(prodId)})
            if(wallet){

            }else{
               let walletObj={
                    user:objectId(userId),
                    walletAmount: totalPrice,
                    status:true
                }
              await db.get().collection(collection.WALLET_COLLECTION).insertOne(walletObj).then((response)=>{
                resolve() 
              })
            } 
        })
    } ,
    walletDetails:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let getWallet= await db.get().collection(collection.WALLET_COLLECTION).findOne({user:objectId(userId)})
            resolve(getWallet)
        })
    },
    reduceWalletAmount:(userId,total,orderId)=>{
        console.log('total in reducewalletquery');
        console.log(total);
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.WALLET_COLLECTION).updateOne({user:objectId(userId)},
            {
                $inc:{total:-total}
            })

            db.get().collection(collection.WALLET_COLLECTION).updateOne({user:objectId(userId)},
            {
                $push:{
                    transaction:{
                        returnAmount:total,
                        status:false,
                        orderId:orderId
                    }
                    
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    },
    walletStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed',
                    paymentMethod:'wallet'
                }
            }).then(()=>{
                resolve()
            })
        })
    },
    reduceWallet:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.WALLET_COLLECTION).updateOne({user:objectId(userId)},
            {
                $set:{
                    total:0
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    },
    walletTransactions:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let transaction= await db.get().collection(collection.WALLET_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind: '$transaction'
                },
                {
                    $project:{
                        total:1,
                        orderId:'$transaction.orderId',
                        walletAmount:'$transaction.walletAmount',
                        returnAmount:'$transaction.returnAmount',
                        status:'$transaction.status'
                    }
                },
                {
                    $lookup:{
                        from:collection.ORDER_COLLECTION,
                        localField:'orderId',
                        foreignField:'_id',
                        as:'history'
                    }
                },
                {
                    $project:{
                        total:1,
                        orderId:1,
                        walletAmount:1,
                        returnAmount:1,
                        status:1,
                        history: { $arrayElemAt: ['$history', 0] },
                        }
                },
                
            ]).toArray()
            console.log(transaction);
            resolve(transaction)
        })
    }
}



