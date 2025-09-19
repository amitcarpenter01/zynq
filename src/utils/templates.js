export const appointmentBookedTemplate = {
  subject: ({ user_name, appointment_date }) =>
    `New Appointment Booked by ${user_name} - Appointment Booked For ${appointment_date}`,

  body: ({
    user_name,
    doctor_name,
    appointment_date,
    total_price,
    clinic_name
  }) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Appointment Confirmation</title>
    </head>
    <body style="margin:0; font-family: Arial, sans-serif; background-color:#ffffff;">
 
        <!-- Header -->
        <div style="text-align:center; padding:20px 0; font-size:24px; font-weight:bold;">
            ZYNQ
        </div>
 
        <!-- Title Section -->
        <div style="background-color:#1e1e1e; color:#ffffff; padding:40px 20px; text-align:center;">
            <h2 style="margin:0;">New Appointment Booked by ${user_name}</h2>
        </div>
 
        <!-- Content -->
        <div style="padding:20px; color:#333; max-width:600px; margin:0 auto;">
            <p>Hi <strong>${doctor_name}</strong>,</p>
 
            <p>A new appointment has been booked via the app. Here are the booking details:</p>
 
            <p><strong>User Name:</strong> ${user_name}</p>
            <p><strong>Expert Name:</strong> ${doctor_name}</p>
            <p><strong>Clinic Name:</strong> ${clinic_name}</p>
            <p><strong>Date & Time:</strong> ${appointment_date}</p>
            <p><strong>Amount Paid:</strong> ${total_price}</p>
 
            <p>Please prepare for the scheduled session accordingly.<br/>
               This booking has been confirmed and payment has been received.</p>
 
            <p>Best regards,<br/>
            ZYNQ Team</p>
        </div>
 
        <!-- Footer -->
        <div style="text-align:center; font-size:14px; color:#999; padding:20px;">
            <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;" />
            <p>ZYNQ</p>
        </div>
 
    </body>
    </html>
    `
};


export const orderConfirmationTemplate = ({
  orderDate,
  customerName,
  products,
  totalAmount,
  logoUrl = "https://getzynq.io:4000/white_logo.png",
  bannerImageUrl = "https://getzynq.io:4000/product_main.png",
  clinicAddress,
  clinicName
}) => {
  return {
    subject: `Your Order Purchased`,
    body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Confirmation</title>
</head>
<style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
*{
   font-family: 'Poppins', sans-serif;
}
</style>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#ffffff;">
 
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;margin-top: 30px; margin-bottom: 30px;">
    <tr>
      <td align="center">
 
        <!-- Wrapper -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
 
          <!-- Header Logo -->
          <tr>
            <td align="center" style="background-color:#1a1a1a; padding:15px 0; color:#ffffff; font-size:20px; font-weight:bold;">
              <img src="${logoUrl}" style="width: 120px;object-fit: contain;">
            </td>
          </tr>
 
          <!-- Order Info -->
          <tr>
            <td align="center" style="padding:25px 20px 10px 20px; font-size:20px; font-weight:bold; color:#000000;">
              ORDER Purchased
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 20px 20px 20px; font-size:14px; color:#555555;">
              ${orderDate}
            </td>
          </tr>
 
          <!-- Banner Image -->
          <tr>
            <td align="center">
              <img src="${bannerImageUrl}" alt="Order Confirmed" width="600" style="display:block; width:100%; max-width:600px; height:335px; object-fit: cover;">
            </td>
          </tr>
 
          <!-- Thank You Message -->
          <tr>
            <td align="center" style="padding:30px 20px 10px 20px; color:#000000; font-size:20px; font-weight:bold;">
              We Appreciate Your Purchase!
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 20px 20px 20px; font-size:14px; color:#555555; line-height:1.5;">
              Hello ${customerName}, We're getting your order ready for dispatch. We'll notify you as soon as it's on its way.
            </td>
          </tr>
        <tr>
  <td align="center" style="padding:10px 20px 20px 20px;">
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; font-size:14px; color:#555555;">
      <tr style="background-color:#f5f5f5; font-weight:bold;">
        <th align="left">Clinic Name</th>
        <th align="left">Clinic Address</th>
        <th align="left">Date</th>
      </tr>
      <tr>
        <td>${clinicName}</td>
        <td>${clinicAddress}</td>
        <td>${orderDate}</td>
      </tr>
    </table>
  </td>
</tr>
 
          <!-- Product Details -->
          <tr>
            <td style="padding:0 0px; border-radius: 10px; box-shadow: 0px 4px 44px 3px #00000040;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e0e0e0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td colspan="3" style="padding:15px; font-size:16px; font-weight:bold; color:#000000; border-bottom:1px solid #e0e0e0;">
                    Product Details
                  </td>
                </tr>
 
                ${products.map(product => `
                <!-- Product Item -->
                <tr>
               <!--   <td style="padding:15px; width:80px;">
                    <img src="${product.imageUrl || 'product_img.png'}" width="80" style="display:block; border-radius:6px;">
                  </td> -->
                  <td style="padding:15px; font-size:14px; color:#000000;">
                    ${product.name}<br>
                    <span style="color:#777777; font-size:12px;">QTY: ${product.quantity || 1}</span>
                  </td>
                  <td align="right" style="padding:15px; font-size:14px; color:#0056ff; font-weight:bold;">
                    $${product.price}
                  </td>
                </tr>
                `).join('')}
 
                <!-- Total -->
                <tr>
                  <td colspan="2" align="right" style="padding:15px; font-size:14px; color:#000000; border-top:1px solid #e0e0e0;">
                    Total
                  </td>
                  <td align="right" style="padding:15px; font-size:14px; color:#000000; font-weight:bold; border-top:1px solid #e0e0e0;">
                    $${totalAmount}
                  </td>
 
 
 
                 
                </tr>
 
              </table>
 
            </td>
          </tr>
 
        </table>
 
      </td>
    </tr>
  </table>
 
                    <div style="padding-top: 50px; text-align: left;">
<h4 style="margin-bottom: 10px;font-family: 'Poppins', sans-serif;">Best regards,</h4>
<p style="margin-top: 0px;font-family: 'Poppins', sans-serif;">ZYNQ  Team</p>
</div>
 
    <!-- Start footer -->
<table align="center" style="text-align: center; vertical-align: top; width: 100%; max-width: 600px; background-color: #282828;" width="600">
<tbody>
<tr>
<td style="width: 600px; vertical-align: top; padding-left: 30px; padding-right: 30px; padding-top: 30px; padding-bottom: 30px;" width="600px">
 
         
 
              <p style="margin-bottom:10px; margin-top: 0px; text-align:center; color:#fff;font-family: 'Poppins', sans-serif;">Need More Help?</p>
 
              <a href="#" style="color:#fff; text-decoration: underline; text-align:center; display: block; font-family: 'Poppins', sans-serif;">We are here to help you out</a>
 
            </td>
</tr>
</tbody>
</table>
<!-- End footer -->
 
 
 
</body>
</html>
    `
  };
};

export const orderConfirmationTemplateClinic = ({
  orderDate,
  customerName,
  customerAddress,
  clinicName,
  products,
  totalAmount,
  logoUrl = "https://getzynq.io:4000/white_logo.png",
  bannerImageUrl = "https://getzynq.io:4000/product_main.png",
  customerState,
  customerCity,
  customerzipCode,
  customerPhoneNumber
}) => {
  return {
    subject: `Your Order Purchased`,
    body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Confirmation</title>
</head>
<style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
*{
   font-family: 'Poppins', sans-serif;
}
</style>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#ffffff;">
 
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;margin-top: 30px; margin-bottom: 30px;">
    <tr>
      <td align="center">
 
        <!-- Wrapper -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
 
          <!-- Header Logo -->
          <tr>
            <td align="center" style="background-color:#1a1a1a; padding:15px 0; color:#ffffff; font-size:20px; font-weight:bold;">
              <img src="${logoUrl}" style="width: 120px;object-fit: contain;">
            </td>
          </tr>
 
          <!-- Order Info -->
          <tr>
            <td align="center" style="padding:25px 20px 10px 20px; font-size:20px; font-weight:bold; color:#000000;">
              ORDER Purchased
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 20px 20px 20px; font-size:14px; color:#555555;">
              ${orderDate}
            </td>
          </tr>
 
          <!-- Banner Image -->
          <tr>
            <td align="center">
              <img src="${bannerImageUrl}" alt="Order Confirmed" width="600" style="display:block; width:100%; max-width:600px; height:335px; object-fit: cover;">
            </td>
          </tr>
 
          <!-- Thank You Message -->
        <tr>
  <td align="center" style="padding:0 20px 20px 20px; font-size:14px; color:#555555; line-height:1.5;">
    Hello ${clinicName}, you have received a new order from ${customerName}.
  </td>
</tr>
<tr>
  <td align="center" style="padding:10px 20px 20px 20px;">
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; font-size:14px; color:#555555;">
      <tr style="background-color:#f5f5f5; font-weight:bold;">
        <th align="left">Customer Name</th>
        <th align="left">Customer Address</th>
        <th align="left">Customer State</th>
        <th align="left">Customer City</th>
        <th align="left">Customer Zip Code</th>
        <th align="left">Customer Phone Number</th>
        <th align="left">Date</th>
      </tr>
      <tr>
        <td>${customerName}</td>
        <td>${customerAddress}</td>
        <td>${customerState}</td>
        <td>${customerCity}</td>
        <td>${customerzipCode}</td>
        <td>${customerPhoneNumber}</td>
        <td>${orderDate}</td>
      </tr>
    </table>
  </td>
</tr>
 
 
          <!-- Product Details -->
          <tr>
            <td style="padding:0 0px; border-radius: 10px; box-shadow: 0px 4px 44px 3px #00000040;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e0e0e0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td colspan="3" style="padding:15px; font-size:16px; font-weight:bold; color:#000000; border-bottom:1px solid #e0e0e0;">
                    Product Details
                  </td>
                </tr>
 
                ${products.map(product => `
                <!-- Product Item -->
                <tr>
               <!--   <td style="padding:15px; width:80px;">
                    <img src="${product.imageUrl || 'product_img.png'}" width="80" style="display:block; border-radius:6px;">
                  </td> -->
                  <td style="padding:15px; font-size:14px; color:#000000;">
                    ${product.name}<br>
                    <span style="color:#777777; font-size:12px;">QTY: ${product.quantity || 1}</span>
                  </td>
                  <td align="right" style="padding:15px; font-size:14px; color:#0056ff; font-weight:bold;">
                    $${product.price}
                  </td>
                </tr>
                `).join('')}
 
                <!-- Total -->
                <tr>
                  <td colspan="2" align="right" style="padding:15px; font-size:14px; color:#000000; border-top:1px solid #e0e0e0;">
                    Total
                  </td>
                  <td align="right" style="padding:15px; font-size:14px; color:#000000; font-weight:bold; border-top:1px solid #e0e0e0;">
                    $${totalAmount}
                  </td>
 
 
 
                 
                </tr>
 
              </table>
 
            </td>
          </tr>
 
        </table>
 
      </td>
    </tr>
  </table>
 
                    <div style="padding-top: 50px; text-align: left;">
<h4 style="margin-bottom: 10px;font-family: 'Poppins', sans-serif;">Best regards,</h4>
<p style="margin-top: 0px;font-family: 'Poppins', sans-serif;">ZYNQ  Team</p>
</div>
 
    <!-- Start footer -->
<table align="center" style="text-align: center; vertical-align: top; width: 100%; max-width: 600px; background-color: #282828;" width="600">
<tbody>
<tr>
<td style="width: 600px; vertical-align: top; padding-left: 30px; padding-right: 30px; padding-top: 30px; padding-bottom: 30px;" width="600px">
 
         
 
              <p style="margin-bottom:10px; margin-top: 0px; text-align:center; color:#fff;font-family: 'Poppins', sans-serif;">Need More Help?</p>
 
              <a href="#" style="color:#fff; text-decoration: underline; text-align:center; display: block; font-family: 'Poppins', sans-serif;">We are here to help you out</a>
 
            </td>
</tr>
</tbody>
</table>
<!-- End footer -->
 
 
 
</body>
</html>
    `
  };
};

export const faceScanPDFTemplate = ({
  logoUrl = "https://getzynq.io:4000/logo1.png",
  pdf,
  userName = ""
}) => {
  return {
    subject: `Face Scan Report PDF`,
    body: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Skin Analysis Report</title>
</head>
<body style="margin:0; padding:0; background-color:#f7f9fc; font-family: 'Poppins', Arial, sans-serif;">

  <!-- Main Wrapper -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#73c0cda8; padding:20px 0;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:0px; overflow:hidden;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:20px;">
              <img src="${logoUrl}" alt="ZYNQ Logo" width="180" height="85" style="width:180px; height:85px; object-fit:contain; display:block; margin:0 auto;">
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td align="center" style="padding:0;">
              <img src="https://getzynq.io:4000/girl_img.png" alt="Skin Analysis Illustration" width="600" style="width:100%; max-width:600px; height:auto; display:block;">
            </td>
          </tr>

          <!-- Intro Section -->
          <tr>
            <td style="padding:30px 20px; text-align:center;">
              <h2 style="font-size:20px; color:#111111; margin:0 0 15px 0;">✨ Your Skin Analysis Report Is Here</h2>
              <p style="font-size:14px; color:#555555; line-height:20px; margin:0 0 25px 0;">
                Thank You ${userName} For Using ZYNQ AI-Powered Skin Analysis.<br>
                We’ve Carefully Scanned Your Face And Generated A Personalized Report With Insights On Your Skin Health.
              </p>
              <a href="${pdf}" target="_blank" style="display:inline-block; background-color:#000000; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:4px; font-size:14px;">
                Download Report
              </a>
            </td>
          </tr>

          <!-- Features Section -->
          <tr>
            <td style="background-color:#fff; padding:30px 20px; border-top: 1px solid #e6e6e6;">
              <h3 style="font-size:18px; color:#111111; text-align:center; margin:0 0 20px 0;">Inside The Attached Report, You’ll Find</h3>

              <!-- Item 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="50" valign="top" style="text-align:center;">
                    <img src="https://getzynq.io:4000/Simplification.png" alt="Skin Score Icon" width="40" style="display:block; margin:0 auto;">
                  </td>
                  <td valign="top" style="padding-left:10px;">
                    <h4 style="font-size:16px; margin:0; color:#111111;">Your Skin Score & Key Indicators</h4>
                    <p style="font-size:13px; color:#555555; margin:5px 0 0 0; line-height:18px;">
                      Get An Overview Of Your Overall Skin Health Score, With Detailed Metrics On Hydration, Tone, And Balance.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Item 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="50" valign="top" style="text-align:center;">
                    <img src="https://getzynq.io:4000/Simplification_2.png" alt="Detailed Analysis Icon" width="40" style="display:block; margin:0 auto;">
                  </td>
                  <td valign="top" style="padding-left:10px;">
                    <h4 style="font-size:16px; margin:0; color:#111111;">Detailed Analysis Of Concerns</h4>
                    <p style="font-size:13px; color:#555555; margin:5px 0 0 0; line-height:18px;">
                      Understand Specific Skin Issues Through AI-Powered Insights Covering Acne, Dark Spots, Wrinkles, And Elasticity Levels.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Item 3 -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50" valign="top" style="text-align:center;">
                    <img src="https://getzynq.io:4000/Simplification_3.png" alt="Next Steps Icon" width="40" style="display:block; margin:0 auto;">
                  </td>
                  <td valign="top" style="padding-left:10px;">
                    <h4 style="font-size:16px; margin:0; color:#111111;">Next Steps To Improve Your Skin Health</h4>
                    <p style="font-size:13px; color:#555555; margin:5px 0 0 0; line-height:18px;">
                      Get Personalized Recommendations, Lifestyle Tips, And Product Suggestions To Enhance Your Skin Over Time.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:30px 20px; text-align:center; background-color:#ffffff;">
              <div style="padding-top: 0px; text-align: left;">
                <h4 style="margin-bottom: 10px;">Best regards,</h4>
                <p style="margin-top: 0px;">ZYNQ Team</p>
              </div>
            </td>
          </tr>

        </table>
        <!-- End Container -->

        <!-- Start footer -->
        <table align="center" style="text-align: center; vertical-align: top; width: 100%; max-width: 600px; background-color: #282828;" width="600">
          <tbody>
            <tr>
              <td style="padding:30px;">
                <p style="margin-bottom:10px; margin-top: 0px; text-align:center; color:#fff;">Need More Help?</p>
                <a href="#" style="color:#fff; text-decoration: underline; text-align:center; display: block;">We are here to help you out</a>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- End footer -->

      </td>
    </tr>
  </table>
  <!-- End Main Wrapper -->

</body>
</html>
    `
  };
};
