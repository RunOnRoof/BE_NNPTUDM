const Order=require('../models/Order')
const OrderItem=require('../models/OrderItem')
const User=require('../models/User')
const Product=require('../models/Product')
const Cart=require('../models/Cart')
const Size=require('../models/Size')
const Bluebird=require('bluebird')


const searchOrder = async (querySearch,limit,page)=>{

        const orderSearch =await Order.find(querySearch)
                                    .skip((page-1)*limit)
                                    .limit(limit)
                                    .populate('user')
                                    .sort('-_id')
                                    .lean()

        return Bluebird.map(orderSearch,async(item)=>{
            const orderItems= await OrderItem.find({order : {$in : item._id }}).populate('product').lean()
            const totalPrice =orderItems.reduce((total,item)=>{
               return  total + item.quantity * item.price
            },0)
            // console.log(items[0].product)
            return {...item,totalPrice,items:orderItems}
        },{concurrency : orderSearch.length})
}

const searchOrderPage= async(querySearch,limit=50,page=1) => {
            const vLimit=parseInt(limit)
            const vPage=parseInt(page)
            const {status,cancel,user}={...querySearch}
            const query={user,cancel}
            if(status){
                query.status=status
            }
            const [listOrder,totalItem]=await Bluebird.all([searchOrder(query,vLimit,vPage),Order.countDocuments(query)])  
            const pages=Math.ceil(totalItem/vLimit);
            return {listOrder,totalItem,pages};
}

const getOrder=async (req,res,next)=>{
        try{
            const {status,user,cancel,limit,page}={...req.query}
            console.log("query: ",req.query)
            const listOrder=await searchOrderPage({status,user,cancel},limit,page)
            res.status(200).json({success:true,listOrder})
        }   
        catch(error){
            next(error)
        }
}

const createOrder=async (req,res,next)=>{
    try{

        const {infoOrder,cartItem} ={...req.body}
        const newOrder= await Order.create(infoOrder);
        console.log("cartItem: ",cartItem)
        const newOrderItem= cartItem.map(item=>({
            order:newOrder._id,
            ...item,
        }))
        const createOrderItem=await OrderItem.create(newOrderItem)
        Bluebird.map(cartItem,async(item)=>{
            await Size.updateOne(
                {product:item.product,size:item.size},
               { $inc : {numberInStock:-item.quantity}}
                )
        },{concurrency:cartItem.length})
        const cartId=cartItem.map(item=>({
            _id:item.cartId
        }))
        await Cart.deleteMany({ _id : { $in: cartId }})
        res.status(200).json({success:true,newOrder,createOrderItem,status:"ok"})
    }catch(error){
        next(error)
    }

}

const cancelOrder= async(req,res,next)=>{
    try{
            const {cancel ,orderId}={...req.body}
            await Order.updateOne({_id:orderId},{$set: {cancel} })
            const orderItems= await OrderItem.find({order:orderId}).lean()
            Bluebird.map( orderItems , async(item) => {
                await Size.updateOne(
                        {product:item.product,size:item.size},
                        {$inc :{numberInStock :item.quantity}}
                    )
            },{concurrency:orderItems.length})

            res.status(200).json({success:true,status:"ok"})
    }
    catch(error){
        next(error)
    }
}

module.exports={
    createOrder,
    getOrder,
    cancelOrder
}