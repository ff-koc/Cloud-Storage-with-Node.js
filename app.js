const express = require("express");
const app = express();
const util = require("util");
const multer = require('multer');
const mongoose = require("mongoose");
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const ENCRYPTION_KEY = Buffer.from('ZbCKvdLslVuB4y3EZlKate7XGottHski1LmyqJHvUhs=', 'base64');
const IV_LENGTH = 16;

var _ = require('lodash');
var path = require('path');
let ejs = require('ejs');
var fs = require('fs');

app.set('view engine', 'ejs');

var bodyParser = require("body-parser");
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use("/css", express.static(__dirname + "/css"));
app.use(express.static("public"));

app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect('mongodb+srv://mongouser:mongo123@cluster0.uhpcj.mongodb.net/?retryWrites=true&w=majority').then(()=>{console.log('Veri Tabanına Bağlandı')})

var arr = [];

function encrypt(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage
});

const userSchema = new mongoose.Schema({
  id: String,
  password: String
});

const User = mongoose.model("User", userSchema);

var dosyalarSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
});

const klasoriciKlasorSchema = new mongoose.Schema({
  name: String,
  ustKlasoru: String,
  kullanicisi: String,
  items: [dosyalarSchema]
});

var klasorlerSchema = new mongoose.Schema({
  klasorHangiKullanicida: String,
  klasorunAdi: String,
  items: [dosyalarSchema]
});

var Item = mongoose.model("Item", dosyalarSchema);
var File = mongoose.model("File", klasorlerSchema);
var Dossier = mongoose.model("Dossier", klasoriciKlasorSchema);

const dosyaAdiDeneme1 = new Item({
  name: "osman_odev.pdf"
});
const dosyaAdiDeneme2 = new Item({
  name: "elektronik_lab_notlarim.txt"
});
const dosyaAdiDeneme3 = new Item({
  name: "blackdesert32.exe"
});

const listSchema = new mongoose.Schema({
  name: String,
  items: [dosyalarSchema]
});

var List = mongoose.model("List", listSchema);
var fileNames = ["osman_odev.pdf", "elektronik_lab_notlarim.txt", "blackdesert32.exe"];

var deleteFolderRecursive = function(path) {
if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file) {
      var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) {
            deleteFolderRecursive(curPath);
        } else {
            fs.unlinkSync(curPath);
        }
    });
    fs.rmdirSync(path);
  }
};

app.get("/kisiyeOzelSayfa", function(req, res) {
  res.render("index", {
    fileListesi: fileNames
  });
});

app.get("/", function(req, res) {
  var dir = './uploads';
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
  res.render("hosgeldiniz.ejs");
});

app.get("/kaydol", function(req, res) {
  res.render("signin.ejs");
});

app.get("/login", function(req, res) {
  res.render("login.ejs");
});

app.get("/favicon.ico", function(req, res) {
  res.sendStatus(204);
});

app.get("/undefined", function(req, res) {
  res.sendStatus(204);
});

app.get("/denemetasarim", function(req,res){
  res.render("deneme");
});

app.get('/download', function(req, res) {
  const file = `${__dirname}/uploads/RiotClientServices.exe`;
  res.download(file); // Set disposition and send it.
});

app.get("/:sayfaAdi", function(req, res) {

  console.log(req.body.sayfaAdi);

  let sayfaAdi = _.startCase(_.toLower(req.params.sayfaAdi));
  sayfaAdi = sayfaAdi.replace(/\s+/g, '');

  console.log("sayfa adi: ");
  console.log(sayfaAdi);

  let dir = "./uploads/"+sayfaAdi;
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

  var tumKlasorler = [];
  var itemler = [];

  List.findOne({
    name: sayfaAdi}, function(err, docs) {
    tumKlasorler = [];
    itemler = [];
    if (docs) {
      if (!err) {
        File.find({
          klasorHangiKullanicida: sayfaAdi
        }, function(err, docs2) {

          docs2.forEach((item, i) => {
            tumKlasorler.push(item.klasorunAdi);
            File.find({
              klasorHangiKullanicida: sayfaAdi,
              klasorunAdi: item.klasorunAdi}, function(err, docs3) {
              itemler.push(docs3[0].items);
            });
          });
        });

        setTimeout(
          () => {
            res.render("index", {
              sayfaninAdı: sayfaAdi,
              dosyaListesi: docs.items,
              klasorListesi: tumKlasorler,
              items: itemler
            }); //klasorlistesi yerine direkt files dan klasoru gonderecez.
          }, 1000);

      } else {
        console.log(err);
      }
    } 
      else {
      let liste = [];
      let klasor = [];
      File.find({
        klasorHangiKullanicida: sayfaAdi}, function(err, docs2) {
        docs2.forEach((item, i) => {
          tumKlasorler.push(item.klasorunAdi);
          File.find({
            klasorHangiKullanicida: sayfaAdi,
            klasorunAdi: item.klasorunAdi}, function(err, docs3) {
            itemler.push(docs3[0].items);
          });
        });
      });

      setTimeout(
        () => {
          res.render("index", {
            sayfaninAdı: sayfaAdi,
            dosyaListesi: liste,
            klasorListesi: tumKlasorler,
            items: itemler
          });
        }, 1000);
    }
  });
});

app.get("/:sayfaAdi/:klasorAdi", function(req, res) {

  let sayfaAdi = _.startCase(_.toLower(req.params.sayfaAdi));
  sayfaAdi = sayfaAdi.replace(/\s+/g, '');

  let klasorAdi = (req.params.klasorAdi);

  let dir = "./uploads/"+sayfaAdi+"/"+klasorAdi;
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }

  let klasorunIcindekiKlasorler = [];  // bu klasörün altındaki oluşturulan klasörler listesi
                          // daha burayı yazmadık.
  let itemler = [];       // bu klasörün içine yüklenen itemler listesi.

  File.find({
    klasorHangiKullanicida: sayfaAdi,
    klasorunAdi: klasorAdi}, function(err, docs) {

    itemler.push(docs[0].items);
  });

  Dossier.find({
    ustKlasoru: klasorAdi
  }, function(err,docs2){
    docs2.forEach(item => klasorunIcindekiKlasorler.push(item) );
  });

  setTimeout(function(){
    res.render("insideFolder", {
      sayfaninAdı: sayfaAdi,
      klasorunAdi: klasorAdi,
      klasorListesi: klasorunIcindekiKlasorler,
      items: itemler
    });
  },1000);
});

app.get("/:sayfaAdi/:ustKlasor/:klasor", function(req,res){

let sayfaAdi = _.startCase(_.toLower(req.params.sayfaAdi));
sayfaAdi = sayfaAdi.replace(/\s+/g, '');

let klasorAdi = req.params.klasor;
let ustKlasor = req.params.ustKlasor;

let dir = "./uploads/"+sayfaAdi+"/"+ustKlasor+"/"+klasorAdi;
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}
  let itemler = [];
  Dossier.find({
    name: klasorAdi,
    ustKlasoru: ustKlasor,
    kullanicisi: sayfaAdi}, function(err, docs) {
    docs[0].items.forEach(item => itemler.push(item));
  });

  setTimeout(function(){
    res.render("klasoriciklasor.ejs",{
      sayfaninAdı: sayfaAdi,
      klasorunAdi: klasorAdi,
      ustKlasor: ustKlasor,
      items: itemler
    });
  },1000);
});

app.post("/kullaniciSayfasi", function(req, res) {

  console.log("KAYIT YAPILIORRR");
  console.log(req.body);
  let userId = req.body.userId;
  let userPassword = req.body.userPassword;

  userPassword = encrypt(userPassword);
  console.log("şifrelenmiş password:" + userPassword);

  User.find({
    id: userId
  }, function(err, docs) {

    if (docs.length == 0) {
      User.insertMany([{
        id: userId,
        password: userPassword
      }], function(err) {
        if (err) {
          console.log(err);
        }
      });
      res.redirect("/" + userId);
    } else {
      res.render("wrongpassword",{yazilacakmetin:"Girdiğiniz Kullanıcı Adı Kullanılmaktadır."});
    }
  });
});

app.post("/signIn", function(req, res) {
  res.redirect("/kaydol"); // res.render("/signin.ejs") de yapılabilir kod kısalacak yukarıdaki get /kaydol silinebilir bu şekilde
});

app.post("/login", function(req, res) {
  res.redirect("/login");
});

app.post("/kontrol", function(req, res) {

  console.log("GELEN KULLANICI ADINI BULACAZ.");
  console.log(req.body);
  let girilenId = req.body.userId;
  let girilenPassword = req.body.userPassword;

  User.find({
    id: girilenId}, function(err, docs) {
    if (docs.length == 0) {

      res.render("wrongpassword", {
        yazilacakmetin: "Kullanıcı kayıtlı değil, lütfen kayıt olunuz."
      });
    } else {
      if (!err) {
        console.log(docs);

        let veritabanindakiSifre = docs[0].password;

        veritabanindakiSifre = decrypt(veritabanindakiSifre);

        if (veritabanindakiSifre == girilenPassword) {
          res.redirect(girilenId);
        } else {
          res.render("wrongpassword", {
            yazilacakmetin: "Hatalı Kullanıcı Şifresi Girdiniz."
          });
        }

      } else {
        console.log("kullanıcı adı hatalı !");
      }
    }
  });
});


app.post("/download", function(req, res) {
  const file = `${__dirname}/uploads/RiotClientServices.exe`;
  res.download(file);
});



app.post('/uploadFile', upload.single('gelenFile'), function(req, res, next) {
  let yuklenenSayfa = req.body.hangiSayfa;
  let dosyaName = req.file.originalname;

  let oldPath = "./uploads/"+dosyaName;
  let newPath = "./uploads/"+yuklenenSayfa+"/"+dosyaName;

  fs.rename(oldPath, newPath, function (err) {
  if (err) throw err
  console.log('Successfully renamed - AKA moved!')
  })

  let item = new Item({
    name: dosyaName
  });

  item.save(function(err) {
    if (!err) {
      console.log("item successfully saved at mongodb");

    } else {
      console.log(err);
    }
  });

  const query = {
    name: yuklenenSayfa
  };

  List.findOneAndUpdate(query, {
    $push: {
      items: item
    }
  }, {
    upsert: true
  }, function(err, res) {
    if (!err) {
      console.log(res);
    } else {
      console.log(err);
    }
  });
  res.redirect(yuklenenSayfa);
});


app.post("/delete", function(req, res) {

  console.log(req.body);

  let itemAdi = req.body.checkboxChecked;
  let sayfa = req.body.listName;
  let buttonOrCheckBox = req.body.button;

  if (buttonOrCheckBox) {
    console.log("button tıklandı.");
    console.log(buttonOrCheckBox);
    const file = `${__dirname}/uploads/`+sayfa+"/"+buttonOrCheckBox;
    res.download(file); 
  } else {

    console.log("KLASÖRSÜZ DOSYA SİLME BLOGUNA GİRİLDİ.");

    List.findOneAndUpdate({
      name: sayfa,
    }, {
      $pull: {
        "items": {
          "name": itemAdi
        }
      }
    }, function(err, doc) {

      setTimeout(
        () => {

            let filePath = `${__dirname}/uploads/`+sayfa+"/"+itemAdi;
            fs.unlinkSync(filePath);

        }, 1000);
        res.redirect(sayfa);
    });
  }
});

app.post("/deleteKlasorici", function(req,res){

  let itemAdi = req.body.checkboxChecked;
  let kullaniciAdi = req.body.listName;
  let klasorunAdi = req.body.klasorAdi;
  let ustKlasor = req.body.ustKlasor;
  let buttonOrCheckBox = req.body.button;
  if (buttonOrCheckBox) {
    console.log("button tıklandı.");
    console.log(buttonOrCheckBox);
    const file = `${__dirname}/uploads/`+kullaniciAdi+"/"+ustKlasor+"/"+klasorunAdi+"/"+buttonOrCheckBox;
    res.download(file);
  } else {

    console.log("KLASOR İÇİNDE KLASORDEN DOSYA SİLME BLOGUNA GİRİLDİ.");

      Dossier.findOneAndUpdate({
        name: klasorunAdi,
        ustKlasoru: ustKlasor,
        kullanicisi: kullaniciAdi
      }, {
        $pull: {
          "items": {
            "name": itemAdi
          }
        }
      }, function(err, doc) {
        setTimeout(
          () => {
              let filePath = `${__dirname}/uploads/`+kullaniciAdi+"/"+ustKlasor+"/"+klasorunAdi+"/"+itemAdi;
              fs.unlinkSync(filePath);
          }, 1000);
          res.redirect(kullaniciAdi+"/"+ustKlasor+"/"+klasorunAdi);
      });
  }
});

app.post("/deleteFromKlasor", function(req,res){

  let itemAdi = req.body.checkboxChecked;
  let kullaniciAdi = req.body.listName;
  let klasorunAdi = req.body.klasorAdi;
  console.log("KLASOR İÇİNDEN DOSYA SİLME BLOGUNA GİRİLDİ.");
  let buttonOrCheckBox = req.body.button;
  
  if (buttonOrCheckBox) {
    console.log("button tıklandı.");
    console.log(buttonOrCheckBox);
    const file = `${__dirname}/uploads/`+kullaniciAdi+"/"+klasorunAdi+"/"+buttonOrCheckBox;
    res.download(file); 
  } else {

    File.findOneAndUpdate({
      klasorunAdi: klasorunAdi,
      klasorHangiKullanicida: kullaniciAdi
    }, {
      $pull: {
        "items": {
          "name": itemAdi
        }
      }
    }, function(err, doc) {

      setTimeout(
        () => {

            let filePath = `${__dirname}/uploads/`+kullaniciAdi+"/"+klasorunAdi+"/"+itemAdi;
            fs.unlinkSync(filePath);

        }, 1000);

        res.redirect(kullaniciAdi+"/"+klasorunAdi);
    });
  }
});

app.post("/klasorOlustur", function(req, res) {

  console.log(req.body);
  let olusturulacakKlasorNerede = req.body.yeniKlasor;
  let olusturulacakKlasorunAdi = req.body.buttonClicked;
  let file = new File({
    klasorHangiKullanicida: olusturulacakKlasorNerede,
    klasorunAdi: olusturulacakKlasorunAdi,
    items: []
  });

  file.save(function(err) {
    if (!err) {
      console.log("file successfully saved at mongodb");

    } else {
      console.log(err);
    }
  });

  res.redirect(olusturulacakKlasorNerede);

});

app.post("/klasoriciKlasorOlustur", function(req,res){
  let ustKlasor = req.body.klasorunAdi;
  let klasorunAdi = req.body.buttonClicked;
  let kullanicininAdi = req.body.yeniKlasor;
  console.log("üst klasörü: "+ ustKlasor);
  console.log("klasorun ismi" + klasorunAdi);
  console.log("kullanıcı adı: "+ kullanicininAdi);

  let klasoriciKlasor = new Dossier ( {
    name:klasorunAdi,
    ustKlasoru: ustKlasor,
    kullanicisi:kullanicininAdi,
    items: []
  })

  klasoriciKlasor.save(function(err){
    if(err){
      console.log(err);
    }else{
      console.log("klasor ici klasor veritabanına kaydedildi.");
    }
  })

  res.redirect(kullanicininAdi+"/"+ustKlasor);

});


app.post('/klasorUploadFile', upload.single('gelenFile'), function(req, res, next) {


  console.log(req.body.klasorAdi + "-----" + "KLASÖRÜN ADI");
  let klasorunAdi = req.body.klasorAdi;
  let hangiSayfaninKlasoru = req.body.hangiSayfa;
  console.log(req.body.hangiSayfa + "---------------" + "BU KLASÖR HANGİ SAYFANIN KLASÖRÜ?");

  let yuklenenDosyaName = req.file.originalname;
  console.log(yuklenenDosyaName + "--------------------------- YUKLENEN DOSYANIN ADI");
  let oldPath = "./uploads/"+yuklenenDosyaName;
  let newPath = "./uploads/"+hangiSayfaninKlasoru+"/"+klasorunAdi+"/"+yuklenenDosyaName;

  fs.rename(oldPath, newPath, function (err) {
  if (err) throw err
  console.log('Successfully renamed - AKA moved!')
  });

  let item = new Item({
    name: yuklenenDosyaName
  });

  item.save(function(err) {
    if (!err) {
      console.log("DOSYA ADI İTEM OLARAK KAYDEDİLDİ.");

    } else {
      console.log("itemi kaydederken hata verdi.");
      console.log(err);
    }
  });


  File.findOne({
    klasorHangiKullanicida: req.body.hangiSayfa,
    klasorunAdi: req.body.klasorAdi
  }, function(err, doc2) {
    if(!err){
      doc2.items.push(item);
      doc2.save();
      console.log("doc:"+doc2);
      console.log(doc2);
    }else{
      console.log("hata var");
      console.log(err);
    }
  });

  res.redirect(req.body.hangiSayfa+"/"+req.body.klasorAdi);

});




app.post("/deleteFile", function(req, res) {

  const klasor = req.body.klasorunAdi;
  const sayfa = req.body.sayfaninAdi;

  let path = `${__dirname}/uploads/`+sayfa+"/"+klasor;
  console.log(path);

  try {
    deleteFolderRecursive(path);

  } catch(err) {
    console.error(err);
  }

  console.log("klasor: " + klasor + " sayfa: " + sayfa);
  File.findOneAndDelete({
    klasorHangiKullanicida: sayfa,
    klasorunAdi: klasor
  }, function(err, docs) {
    if (!err) {
      console.log("klasör silindi");

    } else {
      console.log(err);
    }
  });

  res.redirect(req.body.sayfaninAdi);

});

app.post("/klasoreGit",function(req,res){

  let klasorunAdi = req.body.hangiKlasoreTiklandi;
  let hangiKullanicidanGeliyor = req.body.hangiKullanicidanGeliyor;
  console.log(klasorunAdi+ " " + hangiKullanicidanGeliyor);
  res.redirect(hangiKullanicidanGeliyor+"/"+klasorunAdi);
  
});


app.post("/klasoriciKlasoreGit", function(req,res){
  let tiklananKlasor = req.body.hangiKlasoreTiklandi;
  let ustKlasor = req.body.ustKlasor;
  let klasorunKullanicisi = req.body.hangiKullanicidanGeliyor;
  res.redirect(klasorunKullanicisi+"/"+ustKlasor+"/"+tiklananKlasor);
});

app.post("/klasoriciKlasoruSil", function(req,res){
  let sayfaninAdi = req.body.sayfaninAdi;
  let ustKlasor = req.body.ustKlasor;
  let klasorunAdi = req.body.klasorunAdi;
  let path = `${__dirname}/uploads/`+sayfaninAdi+"/"+ustKlasor+"/"+klasorunAdi;
  console.log(path);

  try {
    deleteFolderRecursive(path);

  } catch(err) {
    console.error(err);
  }

  Dossier.findOneAndDelete({
    name: klasorunAdi,
    ustKlasoru: ustKlasor,
    kullanicisi: sayfaninAdi
  }, function(err, docs) {
    if (!err) {
      console.log("klasör silindi");
    } else {
      console.log(err);
    }
  });
  res.redirect(sayfaninAdi+"/"+ustKlasor);
});

app.post('/klasoriciKlasorUploadFile', upload.single('gelenFile'), function(req, res, next) {

  let klasorunAdi =req.body.klasorunAdi;
  let ustKlasorunAdi = req.body.ustKlasorunAdi;
  let sayfaninAdi = (req.body.sayfaninAdi).trim();
  let yuklenenDosyaName = req.file.originalname;

console.log(req.body);
console.log(klasorunAdi +" ---------------- KLASÖRÜN İÇİNDEKİ KLASÖRÜN ADI");
console.log(ustKlasorunAdi +" ---------------- ÜST KLASÖRÜN ADI");
console.log(sayfaninAdi +" ---------------- SAYFANIN ADI");
console.log(yuklenenDosyaName+"------------------ YUKLENEN DOSYANIN İSMİ")

let oldPath = "./uploads/"+yuklenenDosyaName;
let newPath = "./uploads/"+sayfaninAdi+"/"+ustKlasorunAdi+"/"+klasorunAdi+"/"+yuklenenDosyaName;

fs.rename(oldPath, newPath, function (err) {
if (err) throw err
console.log('Successfully renamed - AKA moved!')
});

let item = new Item({
  name: yuklenenDosyaName
});

item.save(function(err) {
  if (!err) {
    console.log("DOSYA ADI İTEM OLARAK KAYDEDİLDİ.");

  } else {
    console.log("itemi kaydederken hata verdi.");
    console.log(err);

  }
});

Dossier.findOne({
  ustKlasoru: ustKlasorunAdi,
  name: klasorunAdi,
  kullanicisi: sayfaninAdi
}, function(err, doc2) {
  if(!err){
    doc2.items.push(item);
    doc2.save();
    console.log("KLASÖRÜN İTEMİ DOSSİERS COLLECTİONUNDKAİ İLGİLİ İTEME EKLENDİ.");

  }else{
    console.log("hata var");
    console.log(err);
  }
});

res.redirect(sayfaninAdi+"/"+ustKlasorunAdi+"/"+klasorunAdi);

});

app.post("/geriDon", function(req,res){

  let ustKlasor = (req.body.hangiKullanicidanGeliyor).trim();

  res.redirect(ustKlasor);

});

app.post("/geriDonKlasorici", function(req,res){

  console.log(req.body);
  let kullaniciAdi = (req.body.listName).trim();
  let ustKlasor = (req.body.ustKlasor).trim();
  res.redirect(kullaniciAdi+"/"+ustKlasor);
});


app.post("/wrongPass", function(req,res){

  let neredenGeldi = req.body.neredenGeldi;
  if(neredenGeldi == "Girdiğiniz Kullanıcı Adı Kullanılmaktadır.") {
    res.redirect("/kaydol");
  }else{
    res.redirect("/login");
  }
});

app.listen(3000, function(req, res) {
  console.log("server started at port 3000");
});