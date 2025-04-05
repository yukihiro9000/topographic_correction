## Abstract
This study developed a way to automate the topographic correction process, specifically the C and SCS+C methods, using the Google Earth Engine (GEE) as a platform. We developed a script that enables users to specify the target path and row, period of acquisition, and the Normalized Difference Vegetation Index (NDVI) threshold required for correction. Then the desired topographic correction is realized based on these inputs. The data to be corrected were obtained from Landsat 8. Users were required to prepare a limited number of parameters to execute code on the GEE correctly; these included the Landsat path, row, image-acquisition period, country name of the largescale international boundary polygons, the NDVI threshold used for the regression analysis, and the center latitude and longitude of the display screen. The NDVI and slope angle obtained from a digital elevation model were used to define the area to be sampled and to obtain the parameters required for the correction model automatically. It was immediately apparent that shadows were removed from the corrected image compared to the uncorrected image. After comparing the correlation coefficients before and after correction for each band, the corrected values were substantially lower than the uncorrected values, indicating that the correction was made appropriately. The code proposed here requires little extra effort to implement, even when both the C and SCS+C correction methods are applied.

https://www.jstage.jst.go.jp/article/jfp/advpub/0/advpub_2024.004/_article
