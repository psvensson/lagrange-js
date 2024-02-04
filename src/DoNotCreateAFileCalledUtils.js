module.exports = {
    makeEnums: function(list){
        let obj = {}
        list.forEach((item, i) => {
            obj[item] = Symbol(i)
        })
        return Object.freeze(obj)
    }
}