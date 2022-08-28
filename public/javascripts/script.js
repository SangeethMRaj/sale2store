// const { response } = require("../../app");

function addToCart(proId){
    $.ajax({
        url:'/add-to-cart/'+proId,
        method:'get',
        sucess:(response)=>{
            if(response.status){
                let count=$('#cart-count').html()
                count=parseInt(count)+1
                $("#cart-count").html(count)
            }
        }  
    })
}

function changeQuantity(cartId,proId,userId,count){
    event.preventDefault()
    let quantity=parseInt(document.getElementById(proId).innerHTML)
    count=parseInt(count)
    $.ajax({
        url:'/change-product-quantity',
        data:{
            user:userId,
            cart:cartId,
            product:proId,
            count:count,
            quantity:quantity
        },
        method:'post',
        success:(response)=>{
            if(response.removeProduct){
                alert("Product removed from cart")
                location.reload()
            }else{
                document.getElementById(proId).innerHTML=quantity+count
                document.getElementById('total').innerHTML=response.total.total
                document.getElementById('discounttotal').innerHTML=response.total.discount
                
            }
            
        }
    })
}

function deleteCartProducts(cartId,proId,count){
    event.preventDefault()
    let quantity=parseInt(document.getElementById(proId).innerHTML)
    count=parseInt(count)
    $.ajax({
        url:'/delete-cart-products',
        data:{
            cart:cartId,
            product:proId,
            count:count,
            quantity:quantity
        },
        method:'post',
        success:(response)=>{
            if(response.removeProduct){
                alert("Product removed from cart")
                location.reload() 
            }else{
                document.getElementById(proId).innerHTML=quantity+count
            }  
        }
    })
}

function wishlist(proId){
    event.preventDefault()
    $.ajax({
        url:'/wishlist/'+proId,
        method:'get',
        sucess:(response)=>{
            if(response.status){
                let count=$('#cart-count').html()
                count=parseInt(count)+1
                $("#cart-count").html(count)
            }
        }  
    })
}

function deleteWishlistproducts(wishlistId,prodId,count){
    event.preventDefault()
    $.ajax({
        url:'/remove-wishlistproducts',
        data:{
            wishlist:wishlistId,
            product:prodId
            // count:count,
            // quantity:quantity
        },
        method:'post',
        success:(response)=>{
            if(response.removeProduct){
                alert("Product removed from cart")
                location.reload() 
            }else{
                location.reload()
            }  
        }
    })
}

