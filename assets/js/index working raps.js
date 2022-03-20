$( document ).ready(function() {
  var balance = "none";
  var qty = 0;
  var total_cost = 0;
  var signbt_flag = false;
  var wallet_address = "";
  var NFT_contract;
  var total = 0;
  var raps = 0;
  var reserve = 0;
  var nft_max = 0;
  var nft_price = 0;
  var tkname = "";
  var max = 0;
  var mintactive = false;
  var time_flag = true;
  
  var right_net_sti = "";
  
  var set_chainId = 4; //1: mainnet, 4: rinkeby
  var curr_chainId = "";
  
  try {
    if (typeof window.web3 !== "undefined" || typeof window.ethereum !== 'undefined') {

      window.web3 = new Web3(Web3.givenProvider);
  
      NFT_contract = new window.web3.eth.Contract(ABI, ADDRESS);// for mint
      
      (async () => {
        try {
          
          // for net or account change
          await window.ethereum.on('accountsChanged', (wallet) => {
            if(wallet_address != wallet[0] && signbt_flag) {
              disconnect();
              alert("Wallet address has changed. Reconnect new wallet!")
            }
          });
    
          await window.ethereum.on('chainChanged', (chid) => {
            curr_chainId = chid;
            if(curr_chainId != set_chainId) {
              disconnect();
              $("#othernet").text("please change to Ethereum Mainnet!");
              alert("Network has changed. Please change network to Ethereum Mainnet!")
            } else {
              $("#othernet").text("");
            }
          });
        } catch (err) {}
      })();
    
      $(".connect_bt").click(function() {
        if(!signbt_flag) {
            signIn();
        }
      })

      function disconnect() {
        try {
          clearTimeout(right_net_sti);
          signbt_flag = false;
          $("#address").text("Not Connected. Click CONNECT");
          $("#address").attr("href", "");
          $(".connect_bt").text("Connect");
          $("#ethbalance").text("0.000 ETH");
        } catch (err) {}
      }
  
      async function signIn() {
        try {
          await window.ethereum
            .request({ method: 'eth_requestAccounts'})
            // .enable()
            .then((acc) => {
              window.web3.eth.net.getId().then(async (id) => {
                if(set_chainId == id) {
                  alert("Connect Success!");

                  wallet_address = acc[0];
                  signbt_flag = true;
                  getBalance(wallet_address);
                  $("#address").text(wallet_address.substr(0, 15) + "…" + wallet_address.substr(wallet_address.length - 12, wallet_address.length));
                  $("#address").attr("href", "https://etherscan.io/address/" + wallet_address);
                  $(".connect_bt").text(wallet_address.substr(0, 4) + "…" + wallet_address.substr(wallet_address.length - 3, wallet_address.length));
                  
                  async function realtime() {
                    try {
                      mintactive = await NFT_contract.methods.mintIsActive().call();
                      total = await NFT_contract.methods.totalSupply().call();
                      raps = await NFT_contract.methods.rapsRsrvMntd().call();
                      reserve = await NFT_contract.methods.rapsReserve().call();
                      nft_max = await NFT_contract.methods.MAX_RAPS().call();
                      nft_price = await NFT_contract.methods.rapsPrice().call();
                      tkname = await NFT_contract.methods.symbol().call();
                      max = Number(nft_max) + Number(raps) + Number(reserve);

                      if(total - raps >= nft_max) {
                        $("#buy").hide();
                        $(".connected").hide();
          
                        $("#opensea").show();
                        $(".soldout").show();
                        clearTimeout(right_net_sti);
                      } else {
                        $('.soldout').hide();
                        $("#opensea").hide();
          
                        if(mintactive && time_flag) {
                          $(".activefalse").hide();
                          $('#buy').removeClass('disable');
                          $('#buy').show();
                          $('.connected').show();
                          
                          $('.totalsupply').text(total + " / " + max);
                          total_cost_view($("#eth-input").val());
                          $('#nftprice').text(Intl.NumberFormat().format(nft_price / Math.pow(10, 18)));
                          $("#tkname").text(tkname);
                          var percent = (total * 100/max).toFixed(2) + "%";
                          $('.progress-value').text(percent);
                          if(Math.round(total * 100/max) < 10) {
                            percent = "10%";
                          }
                          $('.progress-bar').width(percent);
          
                          if(signbt_flag) {
                            getBalance(wallet_address);
                          }
                        } else {
                          $(".activefalse").show();
                          $('#buy').addClass('disable');
                          $('#buy').show();
                        }
                      }
                    } catch (err) {}

                    right_net_sti = setTimeout(() => {
                      realtime();
                    }, 10000);
                  }

                  realtime();

                } else {
                  alert("Please change network to Ethereum Mainnet!");
                }
              })
            })
            .catch((error) => {
              if (error.code === 4001) {
                console.log('Please connect to MetaMask.');
              } else {
                console.error(error);
              }
            });
        } catch (err){console.log("signIn: ", err)}
      }
  
    } else {
      alert("No ETH interface plugged. Using read-only.");
    }
  
    $("#changenet").click(function() {
      networkchange();
    })
  
  
    async function networkchange() {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ 'chainId': '0x' + set_chainId.toString(16)}],
        });
      } catch (err) {}
    }
  
    async function getBalance(addr) {
      balance = await window.web3.eth.getBalance(addr);
      $("#ethbalance").text(balance != "none" ? (Math.round((balance / Math.pow(10, 18) + Number.EPSILON) * 10000) / 10000) + " ETH" : "wallet connect failed!");
    }
  
    $("#buy").click(function() {
        buy();
    })
  
    async function buy() {
      try {
        qty = $("#eth-input").val();
        if(signbt_flag) {
          if(qty >= 1 && qty <= 10) {
            if(Number(total_cost) <= (Math.round((balance / Math.pow(10, 18) + Number.EPSILON) * 10000) / 10000)) {
              await NFT_contract.methods.mintRaps(qty).send({value: total_cost * Math.pow(10, 18), from: wallet_address});
            } else {
              alert("The amount of your walvar's ETH is not sufficient!");
            }
          } else {
            alert("please check Qty! Max 10.");
          }
        } else {
          alert("Please connect to Ethereum Mainnet!");
        }
      } catch (err) {console.log("Buy", err)}
    }
  
    $("#eth-input").focus(function() {
      $(this).select();
    })
  
    $("#eth-input").keyup(function() {
      total_cost_view($(this).val());
    })
  
    $("#eth-input").change(function() {
      total_cost_view($(this).val());
    })
  
    function total_cost_view(val) {
      if(val < 0 || val > 10) {
        if(val < 0) {
          $("#eth-input").val(0);
          val = 0;
        } else {
          $("#eth-input").val(10);
          val = 10;
        }
      }
      total_cost = new Intl.NumberFormat().format(val * nft_price / Math.pow(10, 18));
      $("#total").text(total_cost)
    }
  
  } catch (err) {console.log(err)}


  $(window).scroll(function () {

    if ($(window).scrollTop() > 300) {
      $(".bottom-right").show();
    } else {
      $(".bottom-right").hide();
    }
  });

  $(".bottom-right").on("click", function (e) {
    e.preventDefault();
    $("html, body").animate({ scrollTop: 0 }, "100");
  });
  
  // countdown timer part
  
  var deadline = new Date("2021/09/29 21:00:00 GMT+5").getTime();
  
  var x = setInterval(function() {
    // time_flag = false;
    // $(".connected").hide();
    // $(".activefalse").show();
    var now = new Date().getTime();
    var t = deadline - now;
    var days = Math.floor(t / (1000 * 60 * 60 * 24));
    var hours = Math.floor((t % (1000 * 60 * 60 * 24))/(1000 * 60 * 60));
    var minutes = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((t % (1000 * 60)) / 1000);
    document.getElementById("day").innerHTML =days ;
    document.getElementById("hour").innerHTML =hours;
    document.getElementById("minute").innerHTML = minutes; 
    document.getElementById("second").innerHTML =seconds; 

    if (t < 0) {
      time_flag = true;
      $(".connected").show();
      $(".activefalse").hide();
      clearInterval(x);
      document.getElementById("day").innerHTML ='M';
      document.getElementById("hour").innerHTML ='I';
      document.getElementById("minute").innerHTML ='N' ; 
      document.getElementById("second").innerHTML = 'T'; 
    }
  }, 1000);
});  
