var db = require('../config/connection')
var collection = require('../config/collection')
const { ADMIN_COLLECTION } = require('../config/collection')
const e = require('express')
const { compare } = require('bcrypt')
const { response } = require('../app')
const { LogarithmicScale } = require('chart.js')
var objectId = require('mongodb').ObjectId

module.exports = {
    adminLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Name: userData.Name })
            if (admin) {
                if (userData.Password == admin.Password) {
                    response.adm = admin
                    response.status = true
                    resolve(response)
                } else {
                    resolve({ status: false })
                }

            } else {
                resolve({ status: false })
            }

        })
    },
    addCategory: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ category: userData.category })
            if (category) {
                response.status = true
                resolve(response)
            } else {
                db.get().collection(collection.CATEGORY_COLLECTION).insertOne(userData).then((data) => {
                    resolve(data.insertedId)
                })

                resolve({ status: false })
            }

        })
    },
    getAllCategories: () => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).find().toArray().then((categories)=>{
                resolve(categories)
            }).catch((err)=>{
                reject(err)
            })
           
        })
    },
    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ _id: objectId(prodId) }).then((response) => {
                resolve(response)
            }).catch((err)=>{
                reject(err)
            })
        })
    },
    getCategoryDetails: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(prodId) }).then((category) => {
                resolve(category)
            }).catch((err)=>{
                reject(er)
            })
        })
    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ _id: objectId(proId) },
                {
                    $set: {
                        category: proDetails.category,
                        Image: proDetails.Image
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    addProduct: (userData) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).insert(userData).then((data) => {
                resolve()
            })
            userData.banner = false
        })
    },
    getAllProduct: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    getAllProductHome: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().limit(8).toArray()
            resolve(products)
        })
    },
    getProductDetails: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(prodId) }).then((product) => {
                resolve(product)
            }).catch((err)=>{
                reject(err)
            })
        })
    },
    updateEachProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) },
                {
                    $set: {
                        name: proDetails.name,
                        description: proDetails.description,
                        category: proDetails.category,
                        brand: proDetails.brand,
                        color: proDetails.color,
                        size: proDetails.size,
                        weight: proDetails.weight,
                        status: proDetails.status,
                        price: proDetails.price,
                        discount: proDetails.discount,
                        qty: proDetails.qty,
                        image: proDetails.image
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    deleteEachProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(prodId) }).then((response) => {
                resolve(response)
            }).catch((err)=>{
                reject(err)
            })
        })
    },
    getCategoryList: (name) => {

        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).find({ category: name }).toArray().then((product)=>{
                resolve(product)
            }).catch((err)=>{
                reject(err)
            })

            
        })
    },
    addCoupon: (couponData) => {
        couponData.users = []
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).insertOne(couponData).then((data) => {
                resolve()
            })
        })
    },
    getCouponList: () => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(coupon)
        })
    },
    deleteCoupon: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectId(prodId) }).then((response) => {
                resolve(response)
            }).catch((err)=>{
                reject(err)
            })
        })
    },
    addBanner: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(prodId) },
                {
                    $set: { banner: true }
                }).then((response) => {
                    resolve(response)
                }).catch((err)=>{
                    reject(err)
                })
        })
    },
    removeBanner: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(prodId) },
                {
                    $set: { banner: false }
                }).then((response) => {
                    resolve(response)
                }).catch((err)=>{
                    reject(err)
                })
        })
    },
    listBannerProducts: () => {
        return new Promise(async (resolve, reject) => {
            let banner = await db.get().collection(collection.PRODUCT_COLLECTION).find({ banner: true }).toArray()
            resolve(banner)
        })
    },
    salesReport: (fromdate, todate) => {
        return new Promise(async (resolve, reject) => {
            let salesreport = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        date: { $gte: fromdate, $lte: todate }

                    }
                },
                {
                    $project: {
                        date: 1,
                        paymentMethod: 1,
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
                    $project: {
                        date: { $dateToString: { format: "%d-%m-%Y", date: "$date" } },
                        paymentMethod: 1,
                        totalAmount: 1,
                        status: 1,
                        item: { $arrayElemAt: ['$products', 0] },
                        userId: { $arrayElemAt: ['$user', 0] }
                    }
                },
                {
                    $sort:{
                        date:-1
                    }
                }
            ]).toArray()
            resolve(salesreport)
        })
    },
    couponHistoryUsers: (couponId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(couponId) }
                },
                {
                    $unwind: '$users'
                },

                {
                    $project: {
                        coupon: 1,
                        discount: 1,
                        expdate: 1,
                        users: { "$toObjectId": "$users" },
                        // products:1
                    }
                },
                {
                    $lookup: {
                        from: collection.USER_COLLECTION,
                        localField: 'users',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $project: {
                        coupon: 1,
                        discount: 1,
                        expdate: 1,
                        // products:1,
                        users: { $arrayElemAt: ['$user', 0] }
                    }
                }
            ]).toArray().then((History)=>{
                resolve(History)
            }).catch((err)=>{
                reject(err)
            })
            
            
        })
    },
    couponHistoryProducts: (couponId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(couponId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $unwind: '$products'
                },


                {
                    $project: {
                        coupon: 1,
                        discount: 1,
                        expdate: 1,
                        products: '$products.item'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'products',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        coupon: 1,
                        discount: 1,
                        expdate: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray().then((HistoryProduct)=>{
                resolve(HistoryProduct)
            }).catch((err)=>{
                reject(err)
            })
            
            
        })
    },
    getTotalCod: () => {
        return new Promise(async (resolve, reject) => {
            let cod = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        paymentMethod: 'COD'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $toInt: '$totalAmount' } }
                    }
                }
            ]).toArray()
            resolve(cod)
        })
    },
    getTotalRazorpay: () => {
        return new Promise(async (resolve, reject) => {
            let Razorpay = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        paymentMethod: 'ONLINE'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $toInt: '$totalAmount' } }
                    }
                }
            ]).toArray()
            resolve(Razorpay)
        })
    },
    getTotalPaypal: () => {
        return new Promise(async (resolve, reject) => {
            let Paypal = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        paymentMethod: 'paypal'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $toInt: '$totalAmount' } }
                    }
                }
            ]).toArray()
            resolve(Paypal)
        })
    },
    getTotalWallet: () => {
        return new Promise(async (resolve, reject) => {
            let wallet = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        paymentMethod: 'wallet'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $toInt: '$totalAmount' } }
                    }
                }
            ]).toArray()
            console.log(wallet);
            console.log('wallet ok');
            resolve(wallet)
        }) 
    },
    getProductGraph: () => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.ORDER_COLLECTION).aggregate([

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
                        as: 'products'
                    }
                },
                {
                    $project: {
                        products: { $arrayElemAt: ['$products', 0] },
                        quantity: 1
                    }
                },
                {
                    $group: {
                        _id: '$products.name',
                        product: { $sum: { $toInt: '$quantity' } }
                    }
                },
                {
                    $sort: { '_id': 1 }
                }
            ]).toArray()
            console.log('getProductGraph');
            console.log(product);
            resolve(product)
        })
    },
    categoryOffer:(data)=>{
           
        return new Promise(async(resolve,reject)=>{
            let Category = await db.get().collection(collection.OFFER_COLLECTION).findOne({category:data.category})
            console.log('same category');
            console.log(Category);
            if(Category){
                db.get().collection(collection.OFFER_COLLECTION).updateOne({category:data.category},
                    {
                        $set:{categoryOffer:data.categoryOffer}
                    })
            }else{
                db.get().collection(collection.OFFER_COLLECTION).insertOne(data).then((data)=>{
                    
                })
            }
            resolve()
            
        })
    },
    applyCategoryOffer:(data) => {
        return new Promise(async(resolve, reject) => {
            let products =await db.get().collection(collection.PRODUCT_COLLECTION).find({category:data.category}).toArray()
           
            if(products){
                products.map((products)=>{
                    productPrice=parseInt(products.price)
    
                    categoryOffer=parseInt(data.categoryOffer)
                    console.log('offer check');
                    console.log(productPrice);
                    console.log(categoryOffer); 
    
                    let newTotal=productPrice-productPrice*(categoryOffer/100)
                    let discount=productPrice-newTotal
                    
                    db.get().collection(collection.PRODUCT_COLLECTION).updateMany({_id:objectId(products._id)},{
                        $set:{
                            offerPrice:newTotal,
                            offer:true,
                            discountPrice:discount,
                        }
                    })
                    resolve()
                })
            }
        })
        },
        allCategoryOffers:()=>{
            return new Promise(async(resolve,reject)=>{
                let offer = await db.get().collection(collection.OFFER_COLLECTION).find().toArray()
                resolve(offer)
            })
        },
        deleteOffer:(prodId,category)=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.OFFER_COLLECTION).deleteOne({_id:objectId(prodId)}).then((response)=>{
                    db.get().collection(collection.PRODUCT_COLLECTION).updateMany({category:category},
                        {
                            $set:{offer:false,discountPrice:0}

                        }).then((response)=>{
                        resolve(response)
                    }).catch((err)=>{
                        reject(err)
                    })
                     
                })
            })
        }

}
