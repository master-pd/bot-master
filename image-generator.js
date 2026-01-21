// image-generator.js
export class ImageGenerator {
  constructor() {
    this.cloudinaryUrl = process.env.CLOUDINARY_URL;
  }
  
  generateWelcomeImage(user, chat) {
    // Generate welcome image using Cloudinary
    const text = `Welcome ${user.first_name} to ${chat.title}`;
    const encodedText = encodeURIComponent(text);
    
    return `${this.cloudinaryUrl}/image/upload/` +
           `c_fill,w_600,h_300,q_auto/` +
           `l_text:Arial_60_bold:${encodedText},co_white/` +
           `b_rgb:4a90e2/` +
           `fl_layer_apply,g_south,y_40/` +
           `sample.jpg`;
  }
  
  generateReportImage(report) {
    // Generate report card image
    const data = [
      `Report ID: ${report.id}`,
      `User: ${report.target_user.name}`,
      `Reason: ${report.reason}`,
      `Status: ${report.status}`
    ].join('\n');
    
    const encodedData = encodeURIComponent(data);
    
    return `${this.cloudinaryUrl}/image/upload/` +
           `c_fill,w_800,h_400,q_auto/` +
           `l_text:Monospace_30:${encodedData},co_black/` +
           `b_rgb:f8f9fa/` +
           `fl_layer_apply,g_center/` +
           `sample.jpg`;
  }
}
