var express = require('express');
var router = express.Router();
const { response } = require('../app');
const userHelpers = require('../helpers/user-helpers');
const productHelpers = require('../helpers/product-helpers');
const { route } = require('./admin');
const { Db } = require('mongodb');
const paypal = require('paypal-rest-sdk');
const collection = require('../config/collection');
const session = require('express-session');
 
paypal.configure({
  'mode': 'sandbox', 
  'client_id': 'AVkgVa5jL54LF5m-ZxU9sdIDkr2_o8zhl08KehVCuNWQcIPkWzDq3xMZuDuW0odLjQjRUqmNV_UFp91a',
  'client_secret': 'EI9VQBU_IWQ_UYWthj69soPkJuWVZCbhfYiOLAePRldL4EVL3KxiTmQxrfBzMrbdq4nLAgjfAhCF_FWE'
});

const accountsid='AC1f38cfd7db296a630c7fc5e288561916'
const authToken='aab5aebf467252f71d47242daf3ed4e7'

const client = require('twilio')(accountsid,authToken);
const serviceID='VA6a27ad98b33805dedfc9c64129d92ade'


const verifyLogin=(req,res,next)=>{
  if(req.session.loggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

router.get('/', async (req, res, next) => {
  let user = req.session.user
  let cartCount=null
  let wishlistCount=null
  if(req.session.user){
    cartCount=await userHelpers.getCartCount(req.session.user._id)
    wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
  }
  // let category = await productHelpers.getAllCategories(req.params.id)
  // let products = await productHelpers.getAllProductHome(req.params.id)
  let banner = await productHelpers.listBannerProducts()

  productHelpers.getAllCategories(req.params.id).then((category)=>{
    productHelpers.getAllProductHome(req.params.id).then((products)=>{
      res.render('user/index-4', {users:true, user, products, category,cartCount,wishlistCount,banner })
    })
  })
  
    
});  

router.get('/login', function (req, res) { 
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/user-login', { "loginerr": req.session.loginErr, "blockerr": req.session.blockErr })
    req.session.loginErr = false
    req.session.blockErr = false

    
  }
})

router.get('/otp-login',(req,res)=>{
  res.render('user/user-otplogin',{user:req.session.user})
})
router.get('/signup', function (req, res) {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/user-signup', { signerr: req.session.signErr })
    req.session.signErr = false

  }
})

router.post('/getotp',(req,res)=>{
  userHelpers.doOtpLogin(req.body).then((response)=>{
    userdemo = response.user
    if(!response.user){
      console.log('blocked');
    }
  }).catch((err)=>{
    console.log(err);
  })
})

router.post('/otplogin',(req,res)=>{
  let otp=req.body.otp
  console.log(req.body);
  userHelpers.doVerify(otp,userdemo).then((userData)=>{
    req.session.loggedIn=true
    req.session.user=userData
    res.redirect('/')
  })
})
router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    if (response.status) {
      req.session.signErr = true

      res.redirect('/signup')
    } else {
      res.redirect('/login')
    }
  })
})
router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      if (response.user.userStatus) {
        req.session.user = true
        req.session.user = response.user
        req.session.loggedIn = true

        res.redirect('/')
      } else {
        req.session.blockErr = "account blocked"
        res.redirect('/login')
      }
    } else {
      req.session.loginErr = true
      res.redirect('/login')
    }
  })   
}) 
 
router.get('/user-singleproduct/:id' ,async (req, res) => {
  try{
    let user=req.session.user
  // let cartCount=await userHelpers.getCartCount(req.session.user._id)
  let product = await productHelpers.getProductDetails(req.params.id)
  res.render('user/user-singleproduct', {users:true, user,product})
  }catch(err){
    res.render('error')
  }
  
})

router.get('/category-products/:id', (req, res) => {
  try{
    let user=req.session.user
    productHelpers.getCategoryList(req.params.id).then((product) => {
      productHelpers.getAllCategories().then((categories) => {
        res.render('user/category-products', { users:true,user,product, categories})
      })  
    }) 
  }catch(err){
    res.render('error')
  }
 
})   
       
router.get('/user-add-to-cart',verifyLogin,async(req,res)=>{
let user=req.session.user
let cartProductPrice=await userHelpers.cartEachProductPrice(req.session.user._id)
let products=await userHelpers.getCartProducts(req.session.user._id)
let totalPrice=await userHelpers.totalCartPrice(req.session.user._id)
 res.render('user/user-cart',{users:true,products,user,totalPrice,cartProductPrice})
})

router.get('/add-to-cart/:id',(req,res)=>{ 
  
userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
res.json({status:true})
})
}) 

router.post('/change-product-quantity',async(req,res,next)=>{
  console.log('req.body');
  console.log(req.body);
  await userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    console.log('log');
    console.log(response);
    console.log(req.body);
  response.total=await userHelpers.totalCartPrice(req.body.user)
 
  console.log('response.total');
  console.log(response.total);
  res.json(response) 
  })
}) 
 
router.post('/delete-cart-products',(req,res)=>{
  userHelpers.deleteCartProducts(req.body).then((response)=>{
    res.json(response)
    })
})  
router.get('/place-order',verifyLogin,async(req,res)=>{
  let cartProduct=await userHelpers.cartEachProductPrice(req.session.user._id)
  // let products=await userHelpers.getCartProducts(req.session.user._id)
  let totalPrice=await userHelpers.totalCartPrice(req.session.user._id)
  console.log('totalPice coupon issue');
  console.log(totalPrice);
  let address=await userHelpers.getAddress(req.session.user._id)
  let coupon=0;
  res.render('user/user-checkout',{users:true,totalPrice,cartProduct,user:req.session.user,address,coupon})
})       
   
router.post('/place-order',async(req,res)=>{
  let products= await userHelpers.getCartProductList(req.body.userId)
  let totalPrice=req.body.total
  let stock=await userHelpers.stockOfEachProduct(req.session.user._id) 
  req.session.total=totalPrice
  console.log('req.session.total');
  console.log(req.session.total);
  console.log("req.body");
  console.log(req.body.total);
    // let product= await userHelpers.getCartProducts(req.body.userId)
  userHelpers.placeOrder(req.body,products,req.session.total,stock).then(async(orderId)=>{
    
    console.log('totalPrice');
    console.log(totalPrice);
    let wallet = await userHelpers.walletDetails(req.session.user._id)
    console.log('wallet');
    console.log(wallet.total);
    var toReduce=false;
    if(req.body.wallet==='true'){
      req.session.wallet=true
      req.session.walletAmount=wallet.total
      console.log('wallet.total');
      console.log(wallet.total);
      if(wallet.total>totalPrice){
       var toReduce =true;
      }else{
        totalPrice = totalPrice - wallet.total
        req.session.total=totalPrice
        console.log('check'); 
        console.log(req.session.total);
      }
    }

    if(toReduce){
      userHelpers.reduceWalletAmount(req.session.user._id,totalPrice,orderId).then((response)=>{
        console.log('totalPriceeeeeeeeeeeee');
        console.log(totalPrice);
        userHelpers.walletStatus(orderId).then((respone)=>{
          res.json({wallet:true})
        })
      })
    }else{
      if(req.body['payment-method']==='COD'){
        res.json({codSuccess:true}) 
        console.log('response');
        console.log(req.session.total); 
        console.log('response');
      }else if(req.body['payment-method']==='paypal'){
        userHelpers.generatePaypal(orderId,req.session.total).then((response)=>{
          response.paypalSuccess=true
          req.session.orderId=orderId
          console.log("jghfygfdtrdrtdrgvghvhjbjhk");
          console.log(req.body);
          console.log('response');
          res.json(response)
        })
      }
      else{
        userHelpers.generateRazorpay(orderId,req.session.total).then((response)=>{
          console.log('its here');
          res.json(response)
          console.log(response);
        }) 
      } 
    }

  }) 
}) 

router.get('/success',(req,res)=>{
  let amount=req.session.total
  let orderIdPaypal=req.session.orderId
  console.log("amount hjbvghchftgxgch");
  console.log(orderIdPaypal);
  userHelpers.changePaymentStatus(orderIdPaypal).then(()=>{
    const payerId=req.query.PayerID
    const paymentId=req.query.paymentId
    console.log(payerId);
    const execute_payment_json = {
      "payer_id": payerId, 
      "transactions": [{
          "amount": {
              "currency": "USD",
              "total": amount 
          } 
      }]
    };
    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
      if (error) {
          console.log(error.response);
          throw error;
      } else {
          console.log(JSON.stringify(payment));
          res.redirect('/order-confirm')
      }
  });
  })
})
  
router.get('/order-confirm',(req,res)=>{ 
  res.render('user/order-confirm',{users:true,user:req.session.user})
})
 
router.get('/orders',verifyLogin,async(req,res)=>{
  let orders=await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/user-order-list',{users:true,user:req.session.user,orders})
})
       
router.get('/view-orderlist-products/:id',async(req,res)=>{
  try{ 
    let address= await userHelpers.getAddressDetails(req.params.id)
    let products=await userHelpers.getOrderProducts(req.params.id)
    res.render('user/ordered-productslist',{users:true,user:req.session.user,products,address})
  }catch(err){
    res.render('error')
  }  
})    
 
router.get('/cancel-order/:id',async(req,res)=>{
  userHelpers.cancelOrder(req.params.id,req.session.user._id).then((response)=>{
      res.redirect('/orders')  
  }) 
})     

router.get('/return-order-status/:id',(req,res)=>{
  userHelpers.OrderReturn(req.params.id,req.session.user._id).then(()=>{
    res.redirect('/orders')  
  })
})  
router.post('/verify-payment',(req,res)=>{ 
  userHelpers.verifyPayment(req.body).then(()=>{
    if(req.session.wallet){
      userHelpers.reduceWallet(req.session.user._id).then((response)=>{

      })
    }
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log(req.body['order[receipt]']);
      res.json({status:true})
    })
  }).catch((err)=>{
    res.json({status:false,errMsg:''})
  })  
})   

router.get('/user-profile',verifyLogin,async(req,res)=>{
  let usersDetails= await userHelpers.getUserProfile(req.session.user._id)
  let address=await userHelpers.getAddress(req.session.user._id)
  let wallet=await userHelpers.walletDetails(req.session.user._id)
  console.log('wallet');
  console.log(wallet);
  res.render('user/user-profile',{user:req.session.user,users:true,usersDetails,address,wallet})
})  
 
router.get('/add-address',(req,res)=>{
  res.render('user/add-address',{users:true,user:req.session.user})
}) 
  
router.post('/add-address',(req,res)=>{
  userHelpers.addAddress(req.body).then((response)=>{
    res.redirect('/user-profile')
  }) 
}) 

router.get('/change-password',(req,res)=>{
  res.render('user/user-change-password',{users:true,user:req.session.user,status:req.session.pwd})
})

router.post('/change-password',async(req,res)=>{
 
  if(req.session.user.Email==req.body.Email){
   await userHelpers.changePassword(req.body).then((response)=>{
    if(response.status){
      req.session.pwd="Password changed"
      console.log('success');
      res.redirect('/user-profile')
    }else{
      req.session.pwd="Invalid password or Email"
      res.redirect('/change-password')
    }
      
    })
  }else{
    req.session.pwd="Incorrect"
    res.redirect('/change-password')
  }
   
})

router.get('/edit-userprofile/:id',async(req,res)=>{
  try{
    let user=await userHelpers.getUserDetails(req.params.id)
  res.render('user/update-userprofile',{user})
  }catch(err){
    res.render('error')
  }
})
  
router.post('/edit-userprofile/:id',(req,res)=>{
  userHelpers.updateProfile(req.params.id,req.body).then((response)=>{
    res.redirect('/user-profile')
  }) 
}) 

router.get('/delete-address/:id',(req,res)=>{
  try{
    userHelpers.deleteAddress(req.params.id).then((response)=>{
      res.redirect('/user-profile')
    })
  }catch(err){
    res.render('error')
  }

}) 

router.get('/wallet-history',verifyLogin,async(req,res)=>{
  let transaction=await userHelpers.walletTransactions(req.session.user._id)
  res.render('user/wallet-history',{users:true,user:req.session.user,transaction})
})
  
router.get('/user-wishlist',verifyLogin,async(req,res)=>{
  let products= await userHelpers.getWishlistProducts(req.session.user._id)
  res.render('user/user-wishlist',{users:true,user:req.session.user,products})
})

router.get('/wishlist/:id',(req,res)=>{
  userHelpers.wishlist(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  }) 
})

router.post('/remove-wishlistproducts',(req,res)=>{
  console.log('ajax');
  userHelpers.deleteWishlistProducts(req.body).then((response)=>{
    console.log('req.body');
    console.log(req.body);
    res.json(response) 
  })
})
 
router.post('/apply-coupon',async(req,res)=>{
  let products= await userHelpers.getCartProductList(req.body.user)
  userHelpers.applyCoupon(req.body,products).then((response)=>{
    console.log(response);
    res.json(response)
      
  })
})

router.get('/order-invoice/:id',async(req,res)=>{
  try{
    let invoice= await userHelpers.orderInvoice(req.params.id)
  let totalinvoiceprice = await userHelpers.invoiceTotalPrice(req.params.id)
  let couponDiscount=(totalinvoiceprice[0].total-invoice[0].totalAmount)
  res.render('user/order-invoice',{users:true,user:req.session.user,invoice,totalinvoiceprice,couponDiscount})
  }catch(err){
    res.render('error')
  }
  
})

router.get('/add-checkout-address',(req,res)=>{
  res.render('user/user-address',{users:true,user:req.session.user})
})

router.post('/add-checkout-address',(req,res)=>{
  userHelpers.addAddress(req.body).then((response)=>{
    res.redirect('/place-order')
  }) 
})
     
router.get('/logout', (req, res) => { 
  req.session.loggedIn = null 
  req.session.user = null   
  res.redirect('/')
})   
   
module.exports = router;
 

 