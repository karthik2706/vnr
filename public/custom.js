//Mantra Fashion Jewellery
const firebaseConfig = window.firebaseConfig;

//API keys variables
var clientKeyD;
var urlD;
var clientName;

firebase.initializeApp(firebaseConfig);

const clientRef = "-M_M99xUv7WD4c-I2-0z";

const profileRef = "-M_QfL7YC2Bc9s9UMVCB";

const apiKeysRef = "-Ma1U51_omY_C4ZWMEWq";

let ordersData;

let fecthDataOrders;

let profileData;

var userExists = false;

Number.prototype.pad = function(n) {
  if (n==undefined)
      n = 2;
  return (new Array(n).join('0') + this).slice(-n);
}

//Fetch API keys
function fetchApiKeys() {
  firebase
    .app()
    .database()
    .ref(`/oms/clients/${clientRef}/apiKeys`)
    .once("value")
    .then((snapshot) => {
      var apiKeys = snapshot.val();
      var delhiveryKeys = apiKeys.delhivery[apiKeysRef];
      clientKeyD = delhiveryKeys.clientKeyD;
      urlD = delhiveryKeys.urlD;
      clientName = delhiveryKeys.clientName;
    });
}

//Fetch all required API Keys
fetchApiKeys();

function createOrder(data) {
  firebase
    .app()
    .database()
    .ref(`/oms/clients/${clientRef}/orders`)
    .push(data)
    .then(function (resp) {
      // console.log(resp);
      orderSumitted(data, resp);
    });
}

function updateProfile(data) {
  $loading.show();
  firebase
    .app()
    .database()
    .ref(`/oms/clients/${clientRef}/profile/${profileRef}`)
    .update(data)
    .then(function () {
      $loading.hide();
    });
}

function createCustomer(data) {
  var data = data.fields;
  var user = {
    name: data.name,
    address: data.address,
    city: data.city,
    pincode: data.pincode,
    state: data.state || "",
    country: data.country || "India",
    mobile: data.mobile,
    email: data.email,
    isReseller: false,
  };
  var obj = { user: user };

  firebase
    .app()
    .database()
    .ref(`/oms/clients/${clientRef}/customers`)
    .push(obj)
    .then(function () {
      console.log("customer data posted");
    });
}

function fetchProfile() {
  firebase
    .app()
    .database()
    .ref(`/oms/clients/${clientRef}/profile/${profileRef}`)
    .once("value")
    .then((snapshot) => {
      profileData = snapshot.val().fields;
      renderProfile(profileData);
    });
}

function renderProfile(data) {
  $("#profileUpdate")
    .find(":input")
    .each(function () {
      var name = $(this).attr("name");
      $(this).val(data[name]);
    });
  initForm();
}

function checkRows(parentId) {
  var container = $('#'+parentId+' .orderDetails').find('.orderInfo');
  var len = container.length;
  var sno = 0;
  container.each(function(){
    sno = sno+1;
    $(this).find('[name="sno"]').val(sno.pad(2));
  });
  container.find('.addItem').show();
  if(len > 1) {
    container.not(':last').find('.addItem').hide();
  }
}

function resetRows() {
  $('.orderDetails').find('.orderInfo').not(':first').remove();
  checkRows('createOrder');
}

function orderSumitted(data, resp) {
  // console.log(data);
  var orderData = data.fields;
  const $printHtml = $("#element-to-print");
  if (orderData.vendor === "1") {
    $printHtml.find("h2").css("text-align", "center").text("Registered Parcel");
  } else {
    $printHtml.find("h2").css("text-align", "center").text("Courier");
  }
  resetRows();
  $printHtml
    .find(".toAdd")
    .html(
      orderData.name +
        "<br>" +
        orderData.address.replace(/(?:\r\n|\r|\n)/g, "<br>") +
        "<br>" +
        orderData.city +
        "<br> Pincode: " +
        orderData.pincode +
        "<br> Mobile: " +
        orderData.mobile
    );

  $printHtml
    .find(".fromAdd")
    .html(
      (orderData.rname || profileData.cname) +
        "<br>" +
        (orderData.vendor === "1"
          ? profileData.retAddress.replace(/(?:\r\n|\r|\n)/g, "<br>") + "<br>"
          : "") +
        "Mobile: " +
        (orderData.rmobile || profileData.cnumber)
    );
  // console.log(orderData.rmobile, profileData.cnumber);
  $("#createOrder")[0].reset();
  $("#createOrder").addClass("hide");
  $("#printBtn").removeClass("hide");
  $("#saveBtn").removeClass("hide");
  $("#closePrintBtn").removeClass("hide");

  $printHtml.removeClass("hide");
  if (!userExists) {
    createCustomer(data);
  }

  //Create Delhivery WayBill Number
  if (orderData.vendor === "2") {
    delhiveryApis(
      "GET",
      "/waybill/api/fetch/json/",
      {
        token: clientKeyD,
        client_name: clientName,
      },
      trackingDCallback,
      resp._delegate._path.pieces_
    );
  } else {
    refreshOrders();
  }
  //_delegate._path.pieces_
}

//Call back after fetching waybill
function trackingDCallback(data, OrderDetails) {
  // console.log(data, OrderDetails);
  var trackValue = data;
  var orderId = OrderDetails[4];
  //Update Tracking number for Delhivery Order
  var orderRef = firebase
    .app()
    .database()
    .ref(`/oms/clients/${clientRef}/orders/${orderId}/fields`);
  orderRef
    .update({
      tracking: trackValue,
    })
    .then(function () {
      refreshOrders();
    });
}

//Click on Order tab
$("#orders-tab").click(function () {
  refreshOrders();
});

//Refresh Orders
function refreshOrders() {
  if ($.fn.DataTable.isDataTable("#example")) {
    $("#example").dataTable().fnDestroy();
    fetchOrders("example");
  }
}

//Refresh Old Orders
function refreshOldOrders() {
  if ($.fn.DataTable.isDataTable("#oldOrdersexample")) {
    $("#oldOrdersexample").dataTable().fnDestroy();
    fetchOrders("oldOrdersexample");
  }
}

//Fetch Orders
function fetchOrders(div) {
  $loading.show();
  var orderRef = `/oms/clients/${clientRef}/orders`;
  if(div == 'oldOrdersexample') {
    orderRef = `/oms/clients/${clientRef}/oldOrders`;
  }
  firebase
    .app()
    .database()
    .ref(orderRef)
    .once("value")
    .then((snapshot) => {
      ordersData = snapshot.val();
      renderOrders(div, ordersData, true);
      $loading.hide();
    });
}
// var currentTable;
function renderOrders(div, data, isParse) {
  let parseData;

  if (isParse) {
    parseData = [];
    $.each(data, function (key, value) {
      value.fields.key = key;
      parseData.push(value.fields);
    });
  } else {
    parseData = data;
  }

  // currentTable =
  $("#" + div).DataTable({
    data: parseData,
    order: [[1, "desc"]],
    "lengthMenu": [[25, 50, -1], [25, 50, "All"]],
    createdRow: function (row, parseData, dataIndex) {
      $(row).attr({
        "data-bs-id": parseData.key,
        //"data-bs-toggle": "modal",
        "data-bs-target": "#editModal",
      });
      // console.log(parseData);
      if (parseData.isDispatched) {
        $(row).addClass("orderDispatched");
      }
    },
    drawCallback: function () {
      if (div === "exportTable") {
        $("#exportOrders .bulkBtn").removeAttr("disabled");
      }

      if (div === "deleteOrdersTable") {
        $("#selectAll, .checkOrder").removeAttr("disabled");
      }

      $("body").on("click", "#selectAll", function () {
        var $table = $(this).closest("table");
        var isChecked = $(this).is(":checked");
        $table.find("tbody tr").each(function () {
          $(this).find("td:first input")[0].checked = isChecked;
        });
      });
    },
    columns: [
      {
        title: "<input id='selectAll' type='checkbox' />",
        orderable: false,
        style: "os",
        render: function () {
          return "<input name='rowOrder' class='checkOrder' type='checkbox' />";
        },
      },
      {
        title: "Date",
        width: "10%",
        data: "time",
        render: function (data) {
          if (data && data.length) {
            var from = data.split("-");
            return from[2] + "-" + from[1] + "-" + from[0];
          }
          return "";
        },
      },
      { title: "Name", data: "name", width: "10%" },
      { title: "Mobile", data: "mobile" },
      { title: "Reference", data: "ref" },
      { title: "Pincode", data: "pincode" },
      { title: "Reseller", data: "rname", width: "15%" },
      {
        title: "Courier",
        data: "vendor",
        render: function (data) {
          var courier = "";
          switch (data) {
            case "1":
              courier = "India Post";
              break;
            case "2":
              courier = "Delhivery";
              break;
            case "3":
              courier = "DTDC";
              break;
            case "4":
              courier = "Xpressbees";
              break;
          }
          return courier;
        },
      },
      {
        title: "Tracking ID",
        data: "tracking",
      },
    ],
  });
}

function initForm() {
  console.log("init form");
  $("[name=vendor]").trigger("change");
  $("#createOrder").find(".success").text("").removeClass("sucess");
}

function customSiginin(email, password) {
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Signed in
      var user = userCredential.user;
    })
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
    });
}

function authCheck() {
  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      // logged in do nothing
    } else {
      var ui = new firebaseui.auth.AuthUI(firebase.auth());
      ui.start("#firebaseui-auth-container", {
        signInOptions: [
          {
            provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
            signInMethod:
              firebase.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD,
          },
        ],
        signInSuccessUrl: window.location.href,
      });
      $("#auth-modal").addClass("show");
    }
  });
}

var $loading;

$(document).ready(function () {
  authCheck();
  $loading = $(".loading");
  fetchOrders("example");
  fetchProfile();

  $("body").on("submit", "#createOrder", function (event) {
    event.preventDefault();
    var fields = {};
    $(this).find("[name=time]").val(moment().format("DD-MM-YYYY"));
    $(this).not('.orderDetails')
      .find(":input")
      .not("button")
      .each(function () {
        fields[this.name] = $(this).val().trim();
      });
      fields.orderDetails = [];
      $(this).find('.orderDetails .orderInfo').each(function(){
        var orderDetails = {};
        $(this).find(":input")
        .not("button").each(function(){
          orderDetails[this.name] = $(this).val().trim();
        });
        fields.orderDetails.push(orderDetails);
      });

    var obj = { fields: fields };
    if (obj.fields.ref == "") {
      obj.fields.ref = obj.fields.mobile.slice(-5);
    }
    console.log(obj);
    createOrder(obj);
  });

  $("#profileUpdate").submit(function (event) {
    event.preventDefault();
    var fields = {};
    $(this)
      .find(":input")
      .not("button")
      .each(function () {
        fields[this.name] = $(this).val();
      });
    var obj = { fields: fields };
    updateProfile(obj);
  });

  $('.orderDetails').on('click', '.addItem', function(e){
    e.preventDefault();
    var formId = $(e.target).closest('form').attr('id');
    var $row = $(this).closest('.orderInfo').clone(true);
    var count = Number($row.find('[name="sno"]').val());
    var newCount = count+1;
    $row.find(':input').not('button').val('');
    $row.find('[name="sno"]').val(newCount.pad(2));
    $('.orderDetails').append($row);
    checkRows(formId);
  });

  $('.orderDetails').on('click', '.deleteItem', function(e){
    e.preventDefault();
    var formId = $(e.target).closest('form').attr('id');
    var $row = $(this).closest('.orderInfo');
    var count = Number($row.find('[name="sno"]').val());
    if (count > 1) {
      $row.remove();
    }
    checkRows(formId);
  });

  $("#myOrders").on("click", ".updateTracking", function (e) {
    e.preventDefault();
    var rowId = $(this).closest("tr").attr("id");
    var trackValue = $(this).closest("td").find("[name=tracking]").val();
    var orderRef = firebase
      .app()
      .database()
      .ref(`/oms/clients/${clientRef}/orders/${rowId}/fields`);
    orderRef
      .update({
        tracking: trackValue,
      })
      .then(function () {
        refreshOrders();
      });
  });

  $("#old-orders-tab").on("click", function (e) {
    e.preventDefault();
    if ($.fn.DataTable.isDataTable("#oldOrdersexample")) {
      $("#oldOrdersexample").dataTable().fnDestroy();
    }
    fetchOrders("oldOrdersexample");
  });

  $("#myOrders").on("click", ".editTracking", function (e) {
    e.preventDefault();
    var rowId = $(this).closest("tr").attr("id");
    var $trackEle = $(this).closest("td").find("[name=tracking]");
    var $btnEle = $(this).closest("td").find("button");
    var trackValue = $trackEle.val();
    $trackEle.removeAttr("readonly").focus();
    $btnEle.addClass("updateTracking").removeClass("editTracking").text("Save");
  });

  $("body").on("click", "#saveBtn", function (e) {
    e.preventDefault();
    var element = document.getElementById("element-to-print");
    var opt = {
      margin: 1,
      jsPDF: { unit: "in", format: "a5", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  });

  $("body").on("click", "#printBtn", function (e) {
    e.preventDefault();
    var element = document.getElementById("element-to-print");
    var opt = {
      margin: 1,
      jsPDF: { unit: "in", format: "a5", orientation: "portrait" },
    };
    html2pdf()
      .set(opt)
      .from(element)
      .output("blob")
      .then(function (blob) {
        console.log(blob);
        let url = URL.createObjectURL(blob);
        window.open(url); //opens the pdf in a new tab
      });
  });

  $("#closePrintBtn").on("click", function (e) {
    e.preventDefault();
    $("#printBtn").addClass("hide");
    $("#saveBtn").addClass("hide");
    $("#closePrintBtn").addClass("hide");
    $("#createOrder").removeClass("hide");
    const $printHtml = $("#element-to-print");
    $printHtml.find("h2").text("l");
    $printHtml.find(".toAdd").html("");
    $printHtml.find(".fromAdd").html("");
    $printHtml.addClass("hide");
    initForm();
  });

  function editModalMethod(event) {
    var row = event.relatedTarget;
    var data = row["data-order-id"];
    $loading.show();
    var $updateOrderForm = $("#createOrder").clone(true);
    $updateOrderForm.removeClass("hide").find(".OrderSubmit").hide();
    $updateOrderForm.find(".dateId").removeClass("hide");
    $("#updateOrderContainer").html(
      $updateOrderForm.attr({
        id: "updateOrder",
        "data-order-id": data,
      })
    );

    var orderRef = firebase
      .app()
      .database()
      .ref(`/oms/clients/${clientRef}/orders/${data}/fields`);

    orderRef.once("value").then((snapshot) => {
      var orderData = snapshot.val();

      // console.log(orderData);
      $("#updateOrder")
        .find("select")
        .each(function () {
          var $this = $(this);
          var name = $this.attr("name");
          $this.val(orderData[name]).trigger("change");
        });

      $("#updateOrder").not('.orderDetails')
        .find(":input")
        .not("button, select")
        .each(function () {
          var $this = $(this);
          var name = $this.attr("name");
          $this.val(orderData[name]);
        });
        
        $('#updateOrderContainer .orderDetails').html('');
        $(orderData.orderDetails).each(function(){
          var eachRow = '<fieldset class="row orderInfo"><div class="mb-3 col-1"><label class="form-label">S.No</label><input name="sno" type="text" class="form-control" value="'+this.sno+'" readonly></div><div class="mb-3 col-2"><label class="form-label">Item Code</label><input name="iname" type="text" class="form-control" value="'+this.iname+'"></div><div class="mb-3 col-2"><label class="form-label">Item Price</label><input name="iprice" type="text" class="form-control" value="'+this.iprice+'"></div><div class="mb-3 col-1"><label class="form-label">Qty</label><input name="iqty" type="text" class="form-control" value="'+this.iqty+'"></div><div class="mb-3 col-2"><label class="form-label">Total Price</label><input name="itprice" type="text" class="form-control" value="'+this.itprice+'"></div><div class="mb-3 col-4"><br><button class="addItem mt-3">Add Item</button><button class="deleteItem mt-3">Delete Item</button></div></fieldset>';
          $('#updateOrderContainer .orderDetails').append(eachRow);
        });

        // checkRows('updateOrder');
        $loading.hide();
    });
  }

  // var $dataTable = $('.dataTable');
  $("body").on("click", ".dataTable tbody tr", function (event) {
    // console.log(event.target);
    if (!$(event.target).hasClass("checkOrder")) {
      $("#editModal").modal("show", {
        "data-order-id": $(this).attr("data-bs-id"),
      });
    }
  });

  var $editModal = $("#editModal");
  $editModal.on("show.bs.modal", function (event) {
    // console.log(event, data);
    editModalMethod(event);
  });

  $editModal.on("hidden.bs.modal", function (event) {
    $("#updateOrder").html("");
  });

  $("body").on("submit", "#updateOrder", function (event) {
    event.preventDefault();
    var fields = {};
    var orderId = $(this).attr("data-order-id");

    // $(this).find("[name=time]").text(moment().format("DD-MM-YYYY"));
    // $(this)
    //   .find(":input")
    //   .not("button")
    //   .each(function () {
    //     fields[this.name] = $(this).val();
    //   });

      $(this).not('.orderDetails')
      .find(":input")
      .not("button")
      .each(function () {
        fields[this.name] = $(this).val().trim();
      });
      fields.orderDetails = [];
      $(this).find('.orderDetails .orderInfo').each(function(){
        var orderDetails = {};
        $(this).find(":input")
        .not("button").each(function(){
          orderDetails[this.name] = $(this).val().trim();
        });
        fields.orderDetails.push(orderDetails);
      });
      //update here
    var obj = { fields: fields };
    if (obj.fields.ref == "") {
      obj.fields.ref = obj.fields.mobile.slice(-5);
    }

    if (!obj.fields.key || obj.fields.key == "") {
      obj.fields.key = orderId;
    }

    // console.log(obj);

    var orderRef = firebase
      .app()
      .database()
      .ref(`/oms/clients/${clientRef}/orders/${orderId}`);

    orderRef.update(obj).then(function () {
      $(".modal").find(".btn-close").click();
      $('#updateOrder .orderDetails').find('.orderInfo').not(':first').remove();
      checkRows('updateOrder');
      refreshOrders();
    });
  });

  $(".submitUpdate").click(function () {
    $("#updateOrder").submit();
  });

  $(".cancelUpdate").click(function () {
    $("#updateOrder")[0].reset();
  });

  //Calender Plugin
  $("#fromdatepicker, #fromdatepicker1").datepicker({
    dateFormat: "dd-mm-yy",
  });
  $("#todatepicker, #todatepicker1").datepicker({
    dateFormat: "dd-mm-yy",
  });

  $("#exportOrder").change(function () {
    $("#exportOrders .bulkBtn").attr("disabled", "disabled");
  });

  //convert date
  function formateDate(date) {
    if (date && date.length) {
      var dateArr = date.split("-");
      dateArr.reverse();
      return dateArr.join("-");
    } else {
      return "null";
    }
  }

  var exportData;
  // fetchTableOrders('exportOrder', 'exportTable');

  $("#exportOrder").submit(function (event) {
    event.preventDefault();
    fetchTableOrders(this, "exportTable");
  });

  $("#deleteOrders").submit(function (event) {
    event.preventDefault();
    fetchTableOrders(this, "deleteOrdersTable");
  });

  function fetchTableOrders(order, table) {
    var filters = {};
    $(order)
      .find(":input")
      .not("button")
      .each(function () {
        filters[this.name] = $(this).val();
      });

    firebase
      .app()
      .database()
      .ref(`/oms/clients/${clientRef}/orders`)
      .once("value")
      .then((snapshot) => {
        ordersData = snapshot.val();

        let parseData = [];
        $.each(ordersData, function (key, value) {
          value.fields.key = key;
          parseData.push(value.fields);
        });

        var filteredOrders = parseData.filter(function (order) {
          return order.vendor == filters.vendor && !order.isDispatched;
        });

        var startDate = new Date(formateDate(filters.fromdatepicker));
        var endDate;

        if (formateDate(filters.todatepicker) == "null") {
          endDate = new Date(formateDate(filters.fromdatepicker));
        } else {
          endDate = new Date(formateDate(filters.todatepicker));
        }

        var resultProductData = filteredOrders.filter(function (order) {
          var date = new Date(formateDate(order.time));
          return date >= startDate && date <= endDate;
        });

        if ($.fn.DataTable.isDataTable("#" + table)) {
          $("#" + table)
            .dataTable()
            .fnDestroy();
        }

        exportData = resultProductData;
        renderOrders(table, resultProductData, false);
      });
  }

  $(".bulkBtn").click(function (e) {
    e.preventDefault();
    var vendor = $("#exportOrders").find("[name=vendor").val();
    generateXL(vendor, exportData);
  });

  $("[name=cod]").change(function () {
    var $this = $(this);
    var $form = $this.closest("form");
    var val = $this.val();
    if (val == 0) {
      $form.find(".hide-cod").removeClass("show-cod");
    } else {
      $form.find(".hide-cod").addClass("show-cod");
    }
  });

  //Select Vendor Change
  $("[name=vendor]").change(function () {
    var $this = $(this);
    var $form = $this.closest("form");
    var $pin = $form.find("[name=pincode]");
    var val = $this.val();
    var pickupDArray = profileData ? profileData.pickup.split(",") : [];
    var options = "";
    $(pickupDArray).each(function (i, key) {
      options = options + "<option>" + key.trim() + "</option>";
    });
    var $pickupD = $form.find("[name=pickupD]").html(options);
    var city = $form.find("[name=city]").val();
    if (val == 2) {
      $form.find(".hide-2").addClass("show-2");
      $pin.addClass("pinSearch");
    } else {
      $form.find("[name=city]").val(city).removeAttr("readonly");
      $form.find("[name=state]").val("").removeAttr("readonly");
      $form.find("[name=country]").val("").removeAttr("readonly");
      $form.find(".hide-2").removeClass("show-2");
      $pin.removeClass("pinSearch");
    }

    $form.on("blur", ".pinSearch", function (event) {
      var city, state, country;
      var pincode = $(".pinSearch").val();
      var obj = window.pincodes.filter(function (key) {
        return key.pin == pincode;
      });

      if (obj.length) {
        city = obj[0].city;
        state = obj[0].State;
        country = "India";
        // console.log(city, state, country);
        $form.find("[name=city]").val(city); //.attr("readonly", "");
        $form.find("[name=state]").val(state); //.attr("readonly", "");
        $form.find("[name=country]").val(country); //.attr("readonly", "");
      }

      delhiveryApis(
        "GET",
        "/c/api/pin-codes/json/",
        {
          token: clientKeyD,
          filter_codes: pincode,
        },
        pincodeCallback,
        event.target
      );
    });
  });

  //Phone number fetch
  $("#createOrder").on("blur", "[name=mobile]", function () {
    var mobile = $(this).val();
    var mobileData = [];

    firebase
      .app()
      .database()
      .ref(`/oms/clients/${clientRef}/customers`)
      .once("value")
      .then((snapshot) => {
        customersData = snapshot.val();
        $.each(customersData, function (key, value) {
          mobileData.push(value.user);
        });

        var obj = mobileData.filter(function (key) {
          return key.mobile == mobile;
        });

        if (!obj.length) return;

        $("#createOrder")
          .find(":input:visible")
          .not("select")
          .not('.orderDetails :input')
          .each(function () {
            var $this = $(this);
            var name = $this.attr("name");
            if (obj) {
              $this.val(obj[0][name] || "");
            }
          });
        userExists = true;
      });
  });

  //Tracking Code
  var $trackingForm = $("#tracking");
  $(".findOrders").click(function (e) {
    e.preventDefault();
    var mobile = $trackingForm.find("[name=mobile]").val();
    $("#orderResults").removeClass("hide");
    firebase
      .app()
      .database()
      .ref(`/oms/clients/${clientRef}/orders`)
      .once("value")
      .then((snapshot) => {
        ordersData = snapshot.val();

        let parseData = [];
        $.each(ordersData, function (key, value) {
          value.fields.key = key;
          parseData.push(value.fields);
        });

        var filteredOrders = parseData.filter(function (order) {
          return order.mobile == mobile;
        });

        if ($.fn.DataTable.isDataTable("#trackingTable")) {
          $("#trackingTable").dataTable().fnDestroy();
        }

        $.each(filteredOrders, function (key, value) {
          this.tracking = this.vendor + "_" + this.tracking;
        });

        $("#trackingTable").DataTable({
          responsive: true,
          data: filteredOrders,
          drawCallback: function () {
            $("#trackingTable tbody")
              .find("tr")
              .each(function () {
                var data = $(this).find("td:last").text();
                var linkEl;
                var details;
                var link;
                var courier = "";
                var tracking = "";
                if (data && data.length) {
                  details = data.split("_");
                  if (details[0] == "1") {
                    courier = "india-post";
                  } else if (details[0] == "2") {
                    courier = "delhivery";
                  } else if (details[0] == "3") {
                    courier = "dtdc";
                  } else if (details[0] == "4") {
                    courier = "xpressbees";
                  }
                  if (details[1] && details[1].trim().length) {
                    tracking = details[1];
                    link =
                      "https://track.aftership.com/trackings?courier=" +
                      courier +
                      "&tracking-numbers=" +
                      tracking;
                  }

                  if (link && link.length) {
                    linkEl =
                      'Click here -> <a target="_blank" href="' +
                      link +
                      '">' +
                      tracking +
                      "</a>";
                  } else {
                    if (courier.length) linkEl = "Pending";
                  }
                  $(this).find("td:last").html(linkEl);
                }
              });
          },
          columns: [
            { title: "Name", data: "name" },
            { title: "Mobile", data: "mobile" },
            {
              title: "Tracking",
              data: "tracking",
              render: function (data) {
                return data;
              },
            },
          ],
        });

        // renderOrders("trackingTable", filteredOrders, false);
      });
  });

  var removeByAttr = function (arr, attr, value) {
    var i = arr.length;
    while (i--) {
      if (
        arr[i] &&
        arr[i].hasOwnProperty(attr) &&
        arguments.length > 2 &&
        arr[i][attr] === value
      ) {
        arr.splice(i, 1);
      }
    }
    return arr;
  };

  $(".groupAction").click(function (e) {
    e.preventDefault();
    var $this = $(this);
    var table = $("#example");
    var rows = table.find("tbody tr");
    var selectedRows = [];
    rows.each(function () {
      var row = $(this);
      var checkbox = row.find(".checkOrder");
      var disp = checkbox.is(":checked");
      if (disp) {
        selectedRows.push(row.attr("data-bs-id"));
      }
    });
    $(e.target).attr("disabled", "disabled");
    if ($this.hasClass("dispatched")) {
      markAsDispatched(selectedRows, e);
    } else if ($this.hasClass("printSlip")) {
      printSlips(selectedRows, e);
    } else if ($this.hasClass("deleteOrders")) {
      deleteOrders(selectedRows, e);
    } else if ($this.hasClass("move-to-old")) {
      moveToOldOrders(selectedRows, e);
    }
  });

  //Mark as dispatched
  function deleteOrders(data, e) {
    var tableId = $(e.target).closest('.tab-pane').attr('id');
    $(data).each(function (index, val) {
      var orderId = val;
      var orderRef = `/oms/clients/${clientRef}/orders/${orderId}`;
      if(tableId == 'oldOrders') {
        orderRef = `/oms/clients/${clientRef}/oldOrders/${orderId}`;
      }
      firebase
        .app()
        .database()
        .ref(orderRef)
        .remove();
      // removeByAttr(arr, 'key', orderId);
    });
    // refreshOrders();
    if(tableId == 'oldOrders') {
      refreshOldOrders();
    } else {
      refreshOrders();
    }
    $(e.target).removeAttr("disabled");
  }

  //Move to Old Orders
  function moveToOldOrders(data, e) {
    $(data).each(function (index, val) {
      var orderId = val;
      firebase
        .app()
        .database()
        .ref(`/oms/clients/${clientRef}/orders/${orderId}`)
        .once("value").then((snapshot) => {
          var orderData = snapshot.val();
          firebase
            .app()
            .database()
            .ref(`/oms/clients/${clientRef}/oldOrders/${orderId}`)
            .update(orderData);
      });
    });
    deleteOrders(data, e);
    $(e.target).removeAttr("disabled");
  }

  //Mark as dispatched
  function markAsDispatched(data, e) {
    $(data).each(function (index, val) {
      var orderId = val;
      firebase
        .app()
        .database()
        .ref(`/oms/clients/${clientRef}/orders/${orderId}/fields`)
        .update({
          isDispatched: true,
        });
    });
    refreshOrders();
    $(e.target).removeAttr("disabled");
  }

  var countSlips;
  //Print Slips
  function printSlips(data, e) {
    countSlips = data.length;
    $printHtml = $("#bulk-to-print").html("");
    $printHtml.removeClass("hide");

    $(data).each(function (index, val) {
      var orderId = val;
      var orderRef = firebase
        .app()
        .database()
        .ref(`/oms/clients/${clientRef}/orders/${orderId}/fields`);

      orderRef.once("value").then((snapshot) => {
        var orderData = snapshot.val();
        generatePdf(orderData, index);
      });
    });

    $(e.target).removeAttr("disabled");
  }

  //generate PDF
  function generatePdf(data, index) {
    var orderData = data;
    var $pageBreak = $('<div class="html2pdf__page-break">');

    if (orderData.vendor === "1") {
      $pageBreak.append("<h2>" + "Registered Parcel" + "</h2><br>");
    } else {
      $pageBreak.append("<h2>" + "Courier" + "</h2><br>");
    }

    // $printHtml.append('<div class="html2pdf__page-break"></div>');
    // var $pageBreak = $printHtml.find(".html2pdf__page-break");
    $pageBreak
      .append("<div class='toAdd'><h4>To:</h4></div>")
      .append(
        orderData.name +
          "<br>" +
          orderData.address.replace(/(?:\r\n|\r|\n)/g, "<br>") +
          "<br>" +
          orderData.city +
          "<br> Pincode: " +
          orderData.pincode +
          "<br> Mobile: " +
          orderData.mobile
      );
    $pageBreak.append("<br><br>Ref:"+orderData.ref+"<br><br><br>");
    $pageBreak
      .append("<div class='fromAdd'><h4>From:</h4></div>")
      .append(
        (orderData.rname || profileData.cname) +
          "<br>" +
          (orderData.vendor === "1"
            ? profileData.retAddress.replace(/(?:\r\n|\r|\n)/g, "<br>") + "<br>"
            : "") +
          "Mobile: " +
          (orderData.rmobile || profileData.cnumber)
      );

    $printHtml.append($pageBreak);

    if (index + 1 === countSlips) {
      // console.log(countSlips, index, $printHtml.height());
      // $printHtml.css('height', $printHtml.height() * 1.25);
      var element = $printHtml[0];
      var opt = {
        margin: 1,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        pagesplit: true,
        jsPDF: { unit: "in", format: "a5", orientation: "portrait" },
      };
      html2pdf()
        .set(opt)
        .from(element) //.save();
        .output("blob")
        .then(function (blob) {
          let url = URL.createObjectURL(blob);
          window.open(url); //opens the pdf in a new tab
          $printHtml.addClass("hide");
        });
    }
  }

  //Mobile Number Validation
  $("[name=mobile]").blur(function (e) {
    e.preventDefault();
    var $form = $(e.target).closest("form");
    var mobile = $form.find("[name=mobile");
    var message = $form.find(".mobileMessage");
    $form.find(".mobileMessage");
    if (!mobile.val().match("[0-9]{10}")) {
      // console.log("Please put 10 digit mobile number");
      message.addClass("error").removeClass("hide");
      message[0].innerHTML = "Required 10 digits for mobile number";
      return;
    } else {
      message.addClass("hide");
    }
  });
});

window.onload = function () {
  // initForm();
  setTimeout(function () {
    if (!$(".loading").hasClass("hide")) {
      $(".loading").addClass("hide");
    }
  }, 5000);
};

function generateXL(type, data) {
  var createXLSLFormatObj = [];
  var xlsHeader;
  /* XLS Rows Data */
  var xlsRows = [];

  //India Post
  if (type == "1") {
    /* XLS Head Columns */
    xlsHeader = [
      "SL",
      "Barcode",
      "Ref",
      "City",
      "Pincode",
      "Name",
      "ADD1",
      "ADD2",
      "ADD3",
      "ADDREMAIL",
      "ADDRMOBILE",
      "SENDERMOBILE",
      "Weight",
      "COD",
      "InsVal",
      "VPP",
      "PrPdAmount",
      "PrPdType",
      "FMLisenceId",
      "FMSomNo",
      "L",
      "B",
      "H",
      "ContentType",
    ];

    $.each(data, function (index, value) {
      xlsRows.push({
        SL: index + 1,
        Barcode: value.tracking,
        Ref: "",
        City: value.city,
        Pincode: value.pincode,
        Name: value.name,
        ADD1: value.address,
        ADD2: "",
        ADD3: "",
        ADDREMAIL: value.email,
        ADDRMOBILE: value.mobile,
        SENDERMOBILE: value.rmobile,
        Weight: value.weight,
        COD: "",
        InsVal: "",
        VPP: "",
        PrPdAmount: "",
        PrPdType: "",
        FMLisenceId: "",
        FMSomNo: "",
        L: "",
        B: "",
        H: "",
        ContentType: "",
      });
    });
  } else if (type == "2") {
    /* XLS Head Columns */
    xlsHeader = [
      "Waybill",
      "Reference No",
      "Consignee Name",
      "City",
      "State",
      "Country",
      "Address",
      "Pincode",
      "Phone",
      "Mobile",
      "Weight",
      "Payment Mode",
      "Package Amount",
      "Cod Amount",
      "Product to be Shipped",
      "Return Address",
      "Return Pin",
      "fragile_shipment",
      "Seller Name",
      "Seller Address",
      "Seller CST No",
      "Seller TIN",
      "Invoice No",
      "Invoice Date",
      "Quantity",
      "Commodity Value",
      "Tax Value",
      "Category of Goods",
      "Seller_GST_TIN",
      "HSN_Code",
      "Return Reason",
      "Vendor Pickup Location",
      "EWBN",
    ];

    $.each(data, function (index, value) {
      xlsRows.push({
        Waybill: value.tracking || "",
        ReferenceNo: value.ref || value.mobile.slice(-5),
        ConsigneeName: value.name,
        City: value.city,
        State: value.state,
        Country: value.country || "India",
        Address: value.address,
        Pincode: value.pincode,
        Phone: "",
        Mobile: value.mobile.replace("+91", ""),
        Weight: value.weight || "200",
        PaymentMode: value.cod == "1" ? "cod" : "prepaid",
        PackageAmount: value.price,
        CodAmount: value.codprice,
        ProductToBeShipped: value.productName || "Artificial Jewel",
        ReturnAddress: profileData.retAddress,
        ReturnPin: profileData.rpin,
        fragileShipment: value.fragile || "false",
        SellerName: value.rname,
        SellerAddress: profileData.retAddress,
        SellerCSTNo: "",
        SellerTIN: "",
        InvoiceNo: "",
        InvoiceDate: "",
        Quantity: value.qty || "1",
        CommodityValue: value.price || "500",
        TaxValue: value.tax || "0",
        CategoryOfGoods: value.goods || "Artificial Jewel",
        SellerGSTTIN: "",
        HSNCode: "",
        ReturnReason: "",
        VendorPickupLocation: value.pickupD,
        EWBN: "",
      });
    });
  } else {
    console.log("Export is not available for this vendor");
    return;
  }

  createXLSLFormatObj.push(xlsHeader);
  $.each(xlsRows, function (index, value) {
    var innerRowData = [];
    $.each(value, function (ind, val) {
      innerRowData.push(val);
    });
    createXLSLFormatObj.push(innerRowData);
  });

  /* File Name */
  var filename = "Bulk_Order.xlsx";

  /* Sheet Name */
  var ws_name = "Sheet1";

  if (typeof console !== "undefined") console.log(new Date());
  var wb = XLSX.utils.book_new(),
    ws = XLSX.utils.aoa_to_sheet(createXLSLFormatObj);

  /* Add worksheet to workbook */
  XLSX.utils.book_append_sheet(wb, ws, ws_name);

  /* Write workbook and Download */
  if (typeof console !== "undefined") console.log(new Date());
  XLSX.writeFile(wb, filename);
  if (typeof console !== "undefined") console.log(new Date());
}

// $(document).ready(function(){
//   // delhiveryApis(
//   //   "GET",
//   //   "/api/v1/packages//",
//   //   {
//   //     token: clientKeyD,
//   //     waybill: '6218910003032',
//   //   },
//   //   function(resp){
//   //     console.log(resp)
//   //   },
//   //   ''
//   // );
// })

function delhiveryApis(method, service, data, callback, target) {
  $.ajax({
    type: method,
    url: urlD + service,
    data: data,
    contentType: "application/json; charset=utf-8",
    crossDomain: true,
    dataType: "jsonp",
  }).done(function (data) {
    if (console && console.log) {
      callback(data, target);
    }
  });
}

var pinCodeData;
function pincodeCallback(data, target) {
  if (data.delivery_codes.length) {
    pinCodeData = data.delivery_codes[0].postal_code;
    pinCodeData.isInvalid = false;
  } else {
    pinCodeData = {
      isInvalid: true,
    };
  }
  // console.log(pinCodeData);
  var $ele = $(target);
  var $form = $ele.closest("form");
  // console.log(pinCodeData);
  if (pinCodeData.isInvalid) {
    $ele
      .next("span")
      .addClass("error")
      .removeClass("success")
      .text("Invalid or Unservicable Pincode");
  } else {
    $ele
      .next("span")
      .removeClass("error")
      .addClass("success")
      .text("Servicable Pincode");
  }
}
