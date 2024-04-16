var mongoose=require('mongoose')
var Schema=mongoose.Schema

var orderSchema=new Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    deliveryAddress:{
        type:String,
        required:true
    },
    fullName:{
        type:String,
        required:true
    },
    phoneNumber:{
        type:String,
        required:true
    },
    status:{
        type:Boolean,
        default:false
    },
    cancel:{
        type:Boolean,
        default:false
    }
},{timestamps:true});

orderSchema.index({user:1})
var mongooseDelete = require('mongoose-delete');
orderSchema.plugin(mongooseDelete,{deteledAt:true ,overrideMethods: true}) 
module.exports=mongoose.model('Order',orderSchema);