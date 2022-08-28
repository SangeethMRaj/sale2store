var express = require('express');
const userHelpers = require('../helpers/user-helpers');
var router = express.Router();
const productHelpers=require('../helpers/product-helpers')
const multer=require('multer');
const { response } = require('../app');

const verifyAdminLogin=(req,res,next)=>{
  if(req.session.aloggedIn){
    next()
  }else{
    res.redirect('/admin')
  }
}

/* GET users listing. */
router.get('/', function(req, res, next) {
  if(req.session.aloggedIn){
    res.redirect('/admin/view-dashboard')
  }else{
    res.render('admin/admin-login',{admin:true});
  }

  
});
router.get('/view-dashboard',verifyAdminLogin,async(req,res)=>{
  let adm=req.session.adm
  console.log('adminssssssss session');
  console.log(req.session.adm);
  let cod= await productHelpers.getTotalCod()
  let razorpay= await productHelpers.getTotalRazorpay()
  let paypal= await productHelpers.getTotalPaypal()
  let wallet = await productHelpers.getTotalWallet()
  let totalAmount = cod[0].total+razorpay[0].total+paypal[0].total+wallet[0].total
  let productGraph= await productHelpers.getProductGraph()
  res.render('admin/admin-main',{admins:true,adm,cod,razorpay,paypal,wallet,totalAmount,productGraph})
});

router.post('/admin-login',(req,res)=>{
  productHelpers.adminLogin(req.body).then((response)=>{
    console.log(response.status);
    if(response.status){
      req.session.adm = true
      req.session.adm=response.adm
      req.session.aloggedIn=true
      res.redirect('/admin/view-dashboard')
    }else{
      
      res.redirect('/admin')
    }
  })
});


router.get('/view-users',verifyAdminLogin,(req,res)=>{
  userHelpers.getAlluser().then((userList)=>{
    res.render('admin/view-users',{admins:true,userList})
  })
});

router.get('/block-users/:id',(req,res)=>{
  try{
    let userId=req.params.id
  userHelpers.blockUsers(userId).then((response)=>{
    res.redirect('/admin/view-users')
  })
  }catch(err){
    res.render('error')
  }
 
})

router.get('/unblock-users/:id',(req,res)=>{
  try{
    let userId=req.params.id
  userHelpers.unblockUsers(userId).then((response)=>{
    res.redirect('/admin/view-users')
  })
  }catch(err){
    res.render('error')
  }
  
})

router.get('/admin-category',verifyAdminLogin,(req,res)=>{
  productHelpers.getAllCategories().then((categories)=>{
    res.render('admin/admin-category',{admins:true,categories})
  })
})

const fileStorageEngine=multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'./public/images')
  },
  filename:(req,file,cb)=>{
    cb(null,Date.now() + '--'+ file.originalname);
  }
}); 

const upload=multer({storage:fileStorageEngine})


router.get('/add-category',verifyAdminLogin,(req,res)=>{
  res.render('admin/add-category')
})

router.post('/add-category',upload.array('Images',4),(req,res)=>{
  console.log("yes");
  console.log(req.files);
  var filenames=req.files.map(function(file){
    return file.filename
  }) 
  req.body.Image=filenames
  
  productHelpers.addCategory(req.body).then((response)=>{
    if(response.status){
      res.redirect('/admin/add-category')
    }else{
      res.redirect('/admin/admin-category')
    } 
  })
})   

router.get('/delete-category/:id',async(req,res)=>{ 
  try{
    let proId=req.params.id
    productHelpers.deleteProduct(proId).then((response)=>{
      res.redirect('/admin/admin-category')
    })  
  }catch(err){
    res.render('error')
  }
})


router.get('/update-category/:id',verifyAdminLogin,async(req,res)=>{
  try{
    let category=await productHelpers.getCategoryDetails(req.params.id)
    res.render('admin/update-category',{category})
  }catch(err){
    res.render('error')
  }

})


router.post('/update-category/:id',upload.array('Images',4),(req,res)=>{
  var filenames=req.files.map(function(file){
    return file.filename
  })
  req.body.Image=filenames
  productHelpers.updateProduct(req.params.id,req.body).then((response)=>{
    res.redirect('/admin/admin-category')
  })
})

router.get('/view-products',verifyAdminLogin,(req,res)=>{
  productHelpers.getAllProduct().then((products)=>{
    
    res.render('admin/view-products',{admins:true,products})
  })
})



router.get('/add-products',verifyAdminLogin,async(req,res)=>{
  let category=await productHelpers.getAllCategories(req.params.id)
  res.render('admin/add-products',{category,admins:true})
})

router.post('/view-products',upload.array('images',3),function(req,res){
  console.log(req.files);
  var filenames=req.files.map(function(file){
    return file.filename
  })
  req.body.image=filenames
  productHelpers.addProduct(req.body).then((resolve)=>{
    res.redirect('/admin/view-products')
  })
})

router.get('/update-products/:id',verifyAdminLogin,async(req,res)=>{
  try{
    let category=await productHelpers.getAllCategories(req.params.id)
  let product=await productHelpers.getProductDetails(req.params.id)
  res.render('admin/update-product',{admins:true,product,category})
  }catch(err){
    res.render('error')
  }
  
})
 
router.post('/update-products/:id',upload.array('images',3),(req,res)=>{
  var filenames=req.files.map(function(file){
    return file.filename
  }) 
  req.body.image=filenames
  productHelpers.updateEachProduct(req.params.id,req.body).then((response)=>{
    res.redirect('/admin/view-products')
  })
})

router.get('/delete-product/:id',(req,res)=>{
  try{
    let proId=req.params.id
productHelpers.deleteEachProduct(proId).then((response)=>{
  res.redirect('/admin/view-products')
})
  }catch(err){
    res.render('error')
  }
  
})
router.get('/order-list',verifyAdminLogin,async(req,res)=>{
  let orderDetails=await userHelpers.getAdminOrder()
  res.render('admin/order-list',{orderDetails,admins:true})
})   

router.get('/admin-orderlist/:id',verifyAdminLogin,async(req,res)=>{
  try{
    let invoice= await userHelpers.orderInvoice(req.params.id)
  let totalinvoiceprice = await userHelpers.invoiceTotalPrice(req.params.id)
  let couponDiscount=(totalinvoiceprice[0].total-invoice[0].totalAmount)
  res.render('admin/admin-orderlist',{admins:true,invoice,totalinvoiceprice,couponDiscount})
  }catch(err){
    res.render('error')
  }
  
}) 

router.get('/ship-order-status/:id',(req,res)=>{ 
  try{
    userHelpers.OrderShip(req.params.id).then(()=>{  
      res.redirect('/admin/order-list') 
    })
  }catch(err){
    res.render('error')
  }
  
}) 

router.get('/cancel-order-status/:id',(req,res)=>{
  try{
    userHelpers.OrderCancel(req.params.id).then(()=>{
      res.redirect('/admin/order-list')
    })
  }catch(err){
    res.render('error')
  }
  
}) 

router.get('/delivered-order-status/:id',(req,res)=>{
  try{
    userHelpers.OrderDelivered(req.params.id).then(()=>{
      res.redirect('/admin/order-list')
    })
  }catch(err){
    res.render('error')
  }
  
})
  
router.get('/outfordelivery-order-status/:id',(req,res)=>{
  try{
    userHelpers.OrderOutForDelivery(req.params.id).then(()=>{
      res.redirect('/admin/order-list')
    })
  }catch(err){
    res.render('error')
  }
  
})

router.get('/view-coupon',verifyAdminLogin,async(req,res)=>{
  let coupon = await productHelpers.getCouponList()
  res.render('admin/view-coupon',{admins:true,coupon})
})

router.get('/add-coupon',verifyAdminLogin,(req,res)=>{
  res.render('admin/add-coupon',{admins:true}) 
})

router.post('/add-coupon',(req,res)=>{
  productHelpers.addCoupon(req.body).then((resolve)=>{
    res.redirect('/admin/view-coupon')
  })
})

router.get('/delete-coupon/:id',(req,res)=>{
  try{
    productHelpers.deleteCoupon(req.params.id).then((response)=>{
      res.redirect('/admin/view-coupon')
    }) 
  }catch(err){
    res.render('error')
  }
  
})

router.get('/add-banner/:id',(req,res)=>{
  try{
    productHelpers.addBanner(req.params.id).then((response)=>{
      res.redirect('/admin/view-products')
    })
  }catch(err){
    res.render('error')
  }
 
})

router.get('/remove-banner/:id',(req,res)=>{
  try{
    productHelpers.removeBanner(req.params.id).then((response)=>{
      res.redirect('/admin/view-products')
    })
  }catch(err){
    res.render('error')
  }
    
})

router.get('/view-banner',verifyAdminLogin,async(req,res)=>{
  let banners= await productHelpers.listBannerProducts()
  console.log(banners);
  res.render('admin/view-banner',{admins:true,banners})
}) 

router.get('/sales-report',verifyAdminLogin,(req,res)=>{
  let report=req.session.report
  res.render('admin/sales-report',{admins:true,report})
}) 
 
 router.post('/sales-report',(req,res)=>{
  let fromdate = new Date(req.body.fromdate)
  let todate = new Date(req.body.todate)
  console.log(fromdate);
  console.log(todate);
  productHelpers.salesReport(fromdate,todate).then((salesReport)=>{
    req.session.report=salesReport
    res.redirect('/admin/sales-report')
  })
 })

 router.get('/view-couponhistory/:id',verifyAdminLogin,async(req,res)=>{
  try{
    let couponHistory = await productHelpers.couponHistoryUsers(req.params.id)
  let couponHistoryProducts = await productHelpers.couponHistoryProducts(req.params.id)
  res.render('admin/view-couponhistory',{admins:true,couponHistory,couponHistoryProducts})
  }catch(err){
    res.render('error')
  }
  
 })

 router.get('/category-offer',verifyAdminLogin,async(req,res)=>{
  let category=await productHelpers.getAllCategories()
  res.render('admin/admin-category-discount',{admins:true,category})
 })

 router.post('/category-offer',(req,res)=>{
  productHelpers.categoryOffer(req.body).then((resolve)=>{
    productHelpers.applyCategoryOffer(req.body).then((resolve)=>{
      res.redirect('/admin/view-categoryoffer')
    })
  })
 })
 
 router.get('/view-categoryoffer',verifyAdminLogin,async(req,res)=>{
  let offer = await productHelpers.allCategoryOffers()
  res.render('admin/view-categoryoffer',{admins:true,offer})
 })

 router.get('/delete-offer/:id/:category',(req,res)=>{
  try{
    productHelpers.deleteOffer(req.params.id,req.params.category).then((response)=>{
      res.redirect('/admin/view-categoryoffer')
    })
  }catch(err){
    res.render('error')
  }
  
 })  
 

router.get('/logout',(req,res)=>{
  req.session.aloggedIn = null 
  req.session.adm = null 
  res.redirect('/admin')
})
 
module.exports = router; 


 